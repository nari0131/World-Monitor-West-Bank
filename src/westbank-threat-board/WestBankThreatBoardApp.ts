import '@/styles/westbank-threat-board.css';
import maplibregl from 'maplibre-gl';

import {
  getMapProvider,
  getMapTheme,
  getStyleForProvider,
  registerPMTilesProtocol,
} from '@/config/basemap';
import { fetchWestBankDigest } from '@/services/intelligence/westbank-digest-client';
import type { ThreatLevel, WestBankDigestResponse, WestBankSourceHealth } from '@/types';
import { flattenThreatBoardItems, summarizeSourceHealth, type ThreatBoardItem } from './helpers';

const BOARD_TITLE = 'West Bank Threat Board';
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;
const DEFAULT_CENTER: [number, number] = [35.2476, 31.9522];
const DEFAULT_ZOOM = 8.2;

const THREAT_LABELS: Record<ThreatLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

export class WestBankThreatBoardApp {
  private readonly rootId: string;
  private rootEl: HTMLElement | null = null;
  private mapRootEl: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private summaryEl: HTMLElement | null = null;
  private healthEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private mapNoteEl: HTMLElement | null = null;
  private lastUpdatedEl: HTMLElement | null = null;
  private listCountEl: HTMLElement | null = null;
  private refreshButtonEl: HTMLButtonElement | null = null;

  private map: maplibregl.Map | null = null;
  private popup: maplibregl.Popup | null = null;
  private markers = new Map<string, maplibregl.Marker>();
  private fetchController: AbortController | null = null;
  private items: ThreatBoardItem[] = [];
  private selectedId: string | null = null;
  private digest: WestBankDigestResponse | null = null;
  private mapLoaded = false;
  private initialViewportApplied = false;
  private isRefreshing = false;

  constructor(rootId: string) {
    this.rootId = rootId;
  }

  async init(): Promise<void> {
    document.title = BOARD_TITLE;
    this.rootEl = document.getElementById(this.rootId);
    if (!this.rootEl) throw new Error(`Root element #${this.rootId} not found`);

    this.renderShell();
    this.initMap();
    this.bindEvents();

    await this.refreshData({ initial: true });
    window.setInterval(() => {
      void this.refreshData();
    }, REFRESH_INTERVAL_MS);
  }

  private renderShell(): void {
    if (!this.rootEl) return;

    this.rootEl.innerHTML = `
      <div class="wb-threat-board">
        <header class="wb-threat-board__header">
          <div class="wb-threat-board__title-block">
            <p class="wb-threat-board__eyebrow">West Bank monitor</p>
            <h1 class="wb-threat-board__title">${BOARD_TITLE}</h1>
            <p class="wb-threat-board__subtitle">
              Threat markers, incident summaries, and source health on a single screen.
            </p>
          </div>
          <div class="wb-threat-board__topline">
            <div class="wb-threat-board__summary" data-role="summary"></div>
            <div class="wb-threat-board__meta">
              <div class="wb-threat-board__health" data-role="health"></div>
              <div class="wb-threat-board__status-line">
                <span data-role="status">Loading latest digest…</span>
                <span data-role="last-updated">Not refreshed yet</span>
              </div>
            </div>
            <div class="wb-threat-board__actions">
              <button class="wb-threat-board__refresh" type="button" data-role="refresh">Refresh now</button>
            </div>
          </div>
          <div class="wb-threat-board__error" data-role="error" hidden></div>
        </header>

        <main class="wb-threat-board__layout">
          <section class="wb-threat-board__map-panel">
            <div class="wb-threat-board__panel-head">
              <div>
                <p class="wb-threat-board__panel-kicker">Map</p>
                <h2 class="wb-threat-board__panel-title">Threat markers</h2>
              </div>
              <p class="wb-threat-board__panel-note" data-role="map-note"></p>
            </div>
            <div class="wb-threat-board__map" data-role="map"></div>
          </section>

          <section class="wb-threat-board__list-panel">
            <div class="wb-threat-board__panel-head">
              <div>
                <p class="wb-threat-board__panel-kicker">List</p>
                <h2 class="wb-threat-board__panel-title">Incidents and news overview</h2>
              </div>
              <p class="wb-threat-board__panel-note" data-role="list-count"></p>
            </div>
            <div class="wb-threat-board__list" data-role="list"></div>
          </section>
        </main>
      </div>
    `;

    this.mapRootEl = this.rootEl.querySelector<HTMLElement>('[data-role="map"]');
    this.listEl = this.rootEl.querySelector<HTMLElement>('[data-role="list"]');
    this.summaryEl = this.rootEl.querySelector<HTMLElement>('[data-role="summary"]');
    this.healthEl = this.rootEl.querySelector<HTMLElement>('[data-role="health"]');
    this.statusEl = this.rootEl.querySelector<HTMLElement>('[data-role="status"]');
    this.errorEl = this.rootEl.querySelector<HTMLElement>('[data-role="error"]');
    this.mapNoteEl = this.rootEl.querySelector<HTMLElement>('[data-role="map-note"]');
    this.lastUpdatedEl = this.rootEl.querySelector<HTMLElement>('[data-role="last-updated"]');
    this.listCountEl = this.rootEl.querySelector<HTMLElement>('[data-role="list-count"]');
    this.refreshButtonEl = this.rootEl.querySelector<HTMLButtonElement>('[data-role="refresh"]');
  }

  private initMap(): void {
    if (!this.mapRootEl) return;

    registerPMTilesProtocol();
    const provider = getMapProvider();
    const theme = getMapTheme(provider);

    this.map = new maplibregl.Map({
      container: this.mapRootEl,
      style: getStyleForProvider(provider, theme),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      cooperativeGestures: false,
    });

    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    this.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    this.map.on('load', () => {
      this.mapLoaded = true;
      this.map?.resize();
      this.applyInitialViewport();
    });
  }

  private bindEvents(): void {
    this.refreshButtonEl?.addEventListener('click', () => {
      void this.refreshData({ force: true });
    });
  }

  private async refreshData(options: { initial?: boolean; force?: boolean } = {}): Promise<void> {
    if (this.isRefreshing && !options.force) return;

    this.fetchController?.abort();
    const controller = new AbortController();
    this.fetchController = controller;
    this.isRefreshing = true;
    this.renderStatus(options.initial ? 'Loading latest digest…' : 'Refreshing digest…');

    try {
      const digest = await fetchWestBankDigest('en', controller.signal);
      if (controller.signal.aborted) return;

      this.digest = digest;
      this.items = flattenThreatBoardItems(digest);

      const selectedStillExists = this.selectedId && this.items.some((item) => item.id === this.selectedId);
      if (!selectedStillExists) {
        const preferredItem = this.items.find(hasCoordinates) ?? this.items[0] ?? null;
        this.selectedId = preferredItem?.id ?? null;
      }

      this.renderSummary();
      this.renderHealth(digest.sourceHealth);
      this.renderList();
      this.renderMarkers();
      this.renderError(null);
      this.renderStatus(`Auto-refresh every ${Math.round(REFRESH_INTERVAL_MS / 60000)} minutes`);
      this.renderLastUpdated(digest.generatedAt);
      this.renderMapNote();
      this.applyInitialViewport();
      this.syncSelection({ centerMap: false, scrollList: false, openPopup: false });
    } catch (error) {
      if (controller.signal.aborted) return;

      const message = error instanceof Error ? error.message : 'Unknown digest failure';
      this.renderError(message);
      this.renderStatus(this.digest ? 'Showing last successful digest' : 'Digest unavailable');
      if (!this.digest) this.renderEmptyState();
    } finally {
      if (this.fetchController === controller) this.fetchController = null;
      this.isRefreshing = false;
      this.refreshButtonEl?.removeAttribute('disabled');
    }
  }

  private renderSummary(): void {
    if (!this.summaryEl) return;

    const mappedCount = this.items.filter(hasCoordinates).length;
    const selectedItem = this.getSelectedItem();

    this.summaryEl.innerHTML = '';

    this.summaryEl.append(
      this.createSummaryPill(String(mappedCount), 'Mapped markers'),
      this.createSummaryPill(String(this.items.length), 'Digest items'),
      this.createSummaryPill(
        selectedItem ? THREAT_LABELS[selectedItem.threatLevel ?? 'info'] : 'None',
        'Selected threat',
      ),
    );
  }

  private renderHealth(healthEntries: WestBankSourceHealth[]): void {
    if (!this.healthEl) return;

    this.healthEl.innerHTML = '';
    const summary = summarizeSourceHealth(healthEntries);
    this.healthEl.append(
      this.createHealthChip(`${summary.ok} ok`, 'ok'),
      this.createHealthChip(`${summary.degraded} degraded`, 'degraded'),
      this.createHealthChip(`${summary.down} down`, 'down'),
    );

    const actionableEntries = healthEntries.filter((entry) => entry.status !== 'ok');
    for (const entry of actionableEntries.slice(0, 6)) {
      const label = entry.message ? `${entry.sourceName}: ${entry.message}` : `${entry.sourceName}: ${formatHealthCode(entry.code)}`;
      this.healthEl.append(this.createHealthChip(label, entry.status));
    }
  }

  private renderList(): void {
    if (!this.listEl) return;

    this.listEl.innerHTML = '';
    this.listCountEl!.textContent = `${this.items.length} total items`;

    if (this.items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'wb-threat-board__empty';
      empty.textContent = 'No West Bank incident summaries are available yet.';
      this.listEl.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of this.items) {
      fragment.append(this.createListCard(item));
    }

    this.listEl.append(fragment);
    this.syncSelection({ centerMap: false, scrollList: false, openPopup: false });
  }

  private renderMarkers(): void {
    for (const marker of this.markers.values()) marker.remove();
    this.markers.clear();
    this.popup?.remove();
    this.popup = null;

    if (!this.map) return;

    const mappedItems = this.items.filter(hasCoordinates);
    for (const item of mappedItems) {
      const markerEl = document.createElement('button');
      markerEl.type = 'button';
      markerEl.className = `wb-threat-board__marker wb-threat-board__marker--${item.threatLevel ?? 'info'}`;
      markerEl.setAttribute('aria-label', item.title);
      markerEl.dataset.itemId = item.id;

      const pulseEl = document.createElement('span');
      pulseEl.className = 'wb-threat-board__marker-pulse';
      const coreEl = document.createElement('span');
      coreEl.className = 'wb-threat-board__marker-core';

      markerEl.append(pulseEl, coreEl);
      markerEl.addEventListener('click', () => {
        this.selectedId = item.id;
        this.syncSelection({ centerMap: true, scrollList: true, openPopup: true });
      });

      const marker = new maplibregl.Marker({ element: markerEl, anchor: 'center' })
        .setLngLat([item.lon!, item.lat!])
        .addTo(this.map);

      this.markers.set(item.id, marker);
    }
  }

  private renderEmptyState(): void {
    if (this.summaryEl) this.summaryEl.innerHTML = '';
    if (this.healthEl) this.healthEl.innerHTML = '';
    if (this.listEl) {
      this.listEl.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'wb-threat-board__empty';
      empty.textContent = 'Digest data is not available right now.';
      this.listEl.append(empty);
    }
    if (this.mapNoteEl) this.mapNoteEl.textContent = 'No mapped incidents available';
    if (this.listCountEl) this.listCountEl.textContent = '0 total items';
  }

  private createListCard(item: ThreatBoardItem): HTMLElement {
    const card = document.createElement('article');
    card.className = 'wb-threat-board__card';
    card.dataset.itemId = item.id;

    const header = document.createElement('div');
    header.className = 'wb-threat-board__card-head';

    const threatBadge = document.createElement('span');
    threatBadge.className = `wb-threat-board__badge wb-threat-board__badge--${item.threatLevel ?? 'info'}`;
    threatBadge.textContent = THREAT_LABELS[item.threatLevel ?? 'info'];

    const timeBadge = document.createElement('span');
    timeBadge.className = 'wb-threat-board__time';
    timeBadge.textContent = formatRelativeTime(item.publishedAt);

    header.append(threatBadge, timeBadge);

    const title = document.createElement('h3');
    title.className = 'wb-threat-board__card-title';
    title.textContent = item.title;

    const meta = document.createElement('p');
    meta.className = 'wb-threat-board__card-meta';
    meta.textContent = [
      item.placeLabel ?? 'Location pending',
      prettyCategory(item.category),
      item.sourceCount && item.sourceCount > 1 ? `${item.sourceCount} sources` : item.sourceName,
    ]
      .filter(Boolean)
      .join(' • ');

    const excerpt = document.createElement('p');
    excerpt.className = 'wb-threat-board__card-excerpt';
    excerpt.textContent = item.excerpt || 'Open the source link for more detail.';

    const footer = document.createElement('div');
    footer.className = 'wb-threat-board__card-footer';

    const sections = document.createElement('p');
    sections.className = 'wb-threat-board__sections';
    sections.textContent = item.sectionLabels.join(' • ');

    const actions = document.createElement('div');
    actions.className = 'wb-threat-board__card-actions';

    const focusButton = document.createElement('button');
    focusButton.type = 'button';
    focusButton.className = 'wb-threat-board__action wb-threat-board__action--secondary';
    focusButton.textContent = hasCoordinates(item) ? 'Show on map' : 'No coordinates';
    focusButton.disabled = !hasCoordinates(item);
    focusButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.selectedId = item.id;
      this.syncSelection({ centerMap: true, scrollList: false, openPopup: true });
    });

    const sourceLink = document.createElement('a');
    sourceLink.className = 'wb-threat-board__action';
    sourceLink.href = item.link;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noreferrer';
    sourceLink.textContent = 'Open source';
    sourceLink.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    actions.append(focusButton, sourceLink);
    footer.append(sections, actions);

    card.append(header, title, meta, excerpt, footer);
    card.addEventListener('click', () => {
      this.selectedId = item.id;
      this.syncSelection({ centerMap: hasCoordinates(item), scrollList: false, openPopup: hasCoordinates(item) });
    });

    return card;
  }

  private syncSelection(options: { centerMap: boolean; scrollList: boolean; openPopup: boolean }): void {
    const selectedItem = this.getSelectedItem();

    for (const [itemId, marker] of this.markers.entries()) {
      marker.getElement().classList.toggle('is-selected', itemId === this.selectedId);
    }

    if (this.listEl) {
      this.listEl.querySelectorAll<HTMLElement>('.wb-threat-board__card').forEach((card) => {
        const isSelected = card.dataset.itemId === this.selectedId;
        card.classList.toggle('is-selected', isSelected);
        if (isSelected && options.scrollList) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    if (!selectedItem || !hasCoordinates(selectedItem)) {
      this.popup?.remove();
      this.popup = null;
      this.renderSummary();
      return;
    }

    if (options.centerMap && this.map) {
      this.map.flyTo({
        center: [selectedItem.lon!, selectedItem.lat!],
        zoom: Math.max(this.map.getZoom(), 10.8),
        essential: true,
      });
    }

    if (options.openPopup && this.map) {
      this.popup?.remove();
      this.popup = new maplibregl.Popup({
        offset: 18,
        closeButton: false,
        closeOnClick: false,
        maxWidth: '320px',
      })
        .setLngLat([selectedItem.lon!, selectedItem.lat!])
        .setDOMContent(this.buildPopupContent(selectedItem))
        .addTo(this.map);
    }

    this.renderSummary();
  }

  private buildPopupContent(item: ThreatBoardItem): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'wb-threat-board__popup';

    const badge = document.createElement('span');
    badge.className = `wb-threat-board__badge wb-threat-board__badge--${item.threatLevel ?? 'info'}`;
    badge.textContent = THREAT_LABELS[item.threatLevel ?? 'info'];

    const title = document.createElement('h3');
    title.className = 'wb-threat-board__popup-title';
    title.textContent = item.title;

    const meta = document.createElement('p');
    meta.className = 'wb-threat-board__popup-meta';
    meta.textContent = [
      item.placeLabel ?? 'Location pending',
      formatAbsoluteTime(item.publishedAt),
      item.sourceCount && item.sourceCount > 1 ? `${item.sourceCount} sources` : item.sourceName,
    ]
      .filter(Boolean)
      .join(' • ');

    const excerpt = document.createElement('p');
    excerpt.className = 'wb-threat-board__popup-excerpt';
    excerpt.textContent = item.excerpt || 'Open the source link for more detail.';

    const link = document.createElement('a');
    link.className = 'wb-threat-board__popup-link';
    link.href = item.link;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'Open source';

    wrapper.append(badge, title, meta, excerpt, link);
    return wrapper;
  }

  private createSummaryPill(value: string, label: string): HTMLElement {
    const pill = document.createElement('div');
    pill.className = 'wb-threat-board__summary-pill';

    const valueEl = document.createElement('span');
    valueEl.className = 'wb-threat-board__summary-value';
    valueEl.textContent = value;

    const labelEl = document.createElement('span');
    labelEl.className = 'wb-threat-board__summary-label';
    labelEl.textContent = label;

    pill.append(valueEl, labelEl);
    return pill;
  }

  private createHealthChip(text: string, status: 'ok' | 'degraded' | 'down'): HTMLElement {
    const chip = document.createElement('span');
    chip.className = `wb-threat-board__health-chip wb-threat-board__health-chip--${status}`;
    chip.textContent = text;
    return chip;
  }

  private renderStatus(text: string): void {
    if (this.statusEl) this.statusEl.textContent = text;
    this.refreshButtonEl?.toggleAttribute('disabled', this.isRefreshing);
  }

  private renderError(message: string | null): void {
    if (!this.errorEl) return;

    if (!message) {
      this.errorEl.hidden = true;
      this.errorEl.textContent = '';
      return;
    }

    this.errorEl.hidden = false;
    this.errorEl.textContent = message;
  }

  private renderMapNote(): void {
    if (!this.mapNoteEl) return;
    const mappedCount = this.items.filter(hasCoordinates).length;
    const unmappedCount = this.items.length - mappedCount;
    this.mapNoteEl.textContent = mappedCount > 0
      ? `${mappedCount} active markers${unmappedCount > 0 ? ` • ${unmappedCount} list-only items` : ''}`
      : 'No mapped incidents available';
  }

  private renderLastUpdated(value: string | null): void {
    if (!this.lastUpdatedEl) return;
    if (!value) {
      this.lastUpdatedEl.textContent = 'Not refreshed yet';
      return;
    }

    this.lastUpdatedEl.textContent = `Last refresh ${formatRelativeTime(value)} (${formatAbsoluteTime(value)})`;
  }

  private applyInitialViewport(): void {
    if (!this.map || !this.mapLoaded || this.initialViewportApplied) return;

    const mappedItems = this.items.filter(hasCoordinates);
    if (mappedItems.length === 0) return;

    if (mappedItems.length === 1) {
      const item = mappedItems[0];
      if (!item) return;
      this.map.flyTo({
        center: [item.lon!, item.lat!],
        zoom: 10.6,
        essential: true,
      });
    } else {
      const bounds = new maplibregl.LngLatBounds();
      for (const item of mappedItems) {
        bounds.extend([item.lon!, item.lat!]);
      }
      this.map.fitBounds(bounds, { padding: 48, maxZoom: 10.3, duration: 0 });
    }

    this.initialViewportApplied = true;
  }

  private getSelectedItem(): ThreatBoardItem | null {
    if (!this.selectedId) return null;
    return this.items.find((item) => item.id === this.selectedId) ?? null;
  }
}

function hasCoordinates(item: Pick<ThreatBoardItem, 'lat' | 'lon'>): item is ThreatBoardItem & { lat: number; lon: number } {
  return Number.isFinite(item.lat) && Number.isFinite(item.lon);
}

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Unknown time';

  const diffMs = timestamp - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
}

function formatAbsoluteTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Hebron',
  }).format(date);
}

function prettyCategory(category: ThreatBoardItem['category']): string {
  if (!category) return 'General';
  return category
    .split('-')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function formatHealthCode(code: WestBankSourceHealth['code']): string {
  return code.split('_').join(' ');
}
