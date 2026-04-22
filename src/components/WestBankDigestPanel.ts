import { Panel } from './Panel';
import type {
  ClusteredEvent,
  NewsItem,
  ThreatLevel,
  WestBankDigestResponse,
  WestBankSourceHealthCode,
  WestBankSourceHealth,
  WestBankSourceItem,
} from '@/types';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { getWestBankSourceById } from '@/config/westbank-sources';
import { WESTBANK_PANEL_NAMES } from '@/config/variants/westbank';
import { extractWestBankPlaces, extractWestBankPlacesFromCluster, WESTBANK_WATCHLIST } from '@/config/westbank-focus';
import { getWestBankDigestMapTarget, isLowConfidenceSection } from './westbank-digest-helpers';

const THREAT_LABELS: Record<ThreatLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

const HEALTH_CODE_LABELS: Record<WestBankSourceHealthCode, string> = {
  healthy: 'Healthy',
  pending_integration: 'Pending integration',
  empty_window: 'No recent items',
  no_mapped_items: 'No mapped incidents',
  stale_cache: 'Stale cache',
  upstream_timeout: 'Upstream timeout',
  relay_unavailable: 'Relay unavailable',
  proxy_missing: 'Proxy missing',
  digest_unavailable: 'Digest unavailable',
};

type DigestTimeRange = '1h' | '6h' | '24h' | '48h' | '7d' | 'all';

function formatRecency(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 48) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

function renderThreatBadge(level: ThreatLevel): string {
  return `<span class="westbank-digest-threat westbank-digest-threat--${level}">${escapeHtml(THREAT_LABELS[level])}</span>`;
}

function getRangeCutoff(range: DigestTimeRange): number {
  const ranges: Record<DigestTimeRange, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '48h': 48 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    all: Number.POSITIVE_INFINITY,
  };
  return ranges[range];
}

function filterDigestItemsByRange(items: WestBankSourceItem[], range: DigestTimeRange): WestBankSourceItem[] {
  if (range === 'all') return items;
  const cutoff = Date.now() - getRangeCutoff(range);
  return items.filter((item) => {
    const publishedAt = new Date(item.publishedAt).getTime();
    return !Number.isFinite(publishedAt) || publishedAt >= cutoff;
  });
}

function renderVerificationBadge(verification: WestBankSourceItem['verification']): string {
  return `<span class="westbank-digest-chip westbank-digest-chip--verification">${escapeHtml(verification)}</span>`;
}

function isOptionalSourceHealth(health: WestBankSourceHealth): boolean {
  return getWestBankSourceById(health.sourceId)?.type !== 'rss';
}

function formatHealthDetail(health: WestBankSourceHealth): string {
  const codeLabel = HEALTH_CODE_LABELS[health.code];
  if (health.code === 'healthy') {
    return health.staleMinutes != null ? `${health.staleMinutes}m fresh` : codeLabel;
  }
  if (health.code === 'stale_cache' && health.staleMinutes != null) {
    return `${codeLabel} · ${health.staleMinutes}m`;
  }
  if (health.staleMinutes != null) {
    return `${codeLabel} · ${health.staleMinutes}m`;
  }
  return codeLabel;
}

function renderHealthChip(health: WestBankSourceHealth): string {
  const detail = health.message ? ` title="${escapeHtml(health.message)}"` : '';
  return `
    <span class="westbank-health-chip westbank-health-chip--${health.status}"${detail}>
      <span class="westbank-health-chip__source">${escapeHtml(health.sourceName)}</span>
      <span class="westbank-health-chip__detail">${escapeHtml(formatHealthDetail(health))}</span>
    </span>
  `;
}

function renderHealthSummary(healthEntries: WestBankSourceHealth[]): string {
  const issues = healthEntries.filter((entry) => entry.status !== 'ok');
  if (issues.length === 0) return '';

  const coreIssues = issues.filter((entry) => !isOptionalSourceHealth(entry));
  const optionalIssues = issues.filter(isOptionalSourceHealth);
  const downCount = issues.filter((entry) => entry.status === 'down').length;
  const modifier = downCount > 0 || coreIssues.length > 0 ? 'down' : 'degraded';
  const title = coreIssues.length > 0
    ? `${coreIssues.length} core source${coreIssues.length === 1 ? '' : 's'} degraded`
    : `${optionalIssues.length} optional source${optionalIssues.length === 1 ? '' : 's'} degraded`;
  const note = coreIssues.length > 0
    ? 'Coverage is reduced, but the map and incident list continue from feeds that are still responding.'
    : 'Optional feeds are not blocking the current West Bank digest.';

  return `
    <section class="westbank-health-summary westbank-health-summary--${modifier}">
      <div class="westbank-health-summary-title">${escapeHtml(title)}</div>
      <p class="westbank-health-summary-note">${escapeHtml(note)}</p>
    </section>
  `;
}

function getVisibleHealthEntries(healthEntries: WestBankSourceHealth[]): WestBankSourceHealth[] {
  return healthEntries
    .filter((entry) => entry.status !== 'ok')
    .slice(0, 8);
}

export class WestBankDigestPanel extends Panel {
  private onMapNavigate?: (lat: number, lon: number) => void;

  constructor() {
    super({
      id: 'westbank-digest',
      title: WESTBANK_PANEL_NAMES.digest,
      showCount: true,
      trackActivity: false,
    });
    this.setContent('<div class="westbank-digest-empty">Waiting for West Bank incidents...</div>');
    this.content.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-westbank-map-lat][data-westbank-map-lon]');
      if (!target) return;
      event.preventDefault();
      const lat = Number(target.dataset.westbankMapLat);
      const lon = Number(target.dataset.westbankMapLon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        this.onMapNavigate?.(lat, lon);
      }
    });
  }

  public setMapNavigateHandler(handler: (lat: number, lon: number) => void): void {
    this.onMapNavigate = handler;
  }

  private renderEmpty(message: string, healthEntries: WestBankSourceHealth[] = []): void {
    this.setCount(0);
    const visibleHealth = getVisibleHealthEntries(healthEntries);
    this.setContent(`
      <div class="westbank-digest">
        ${renderHealthSummary(healthEntries)}
        ${visibleHealth.length > 0 ? `<div class="westbank-health-row">${visibleHealth.map(renderHealthChip).join('')}</div>` : ''}
        <div class="westbank-digest-empty">
          <p class="westbank-digest-empty-title">${escapeHtml(message)}</p>
          <div class="westbank-digest-watchlist">
            ${WESTBANK_WATCHLIST.slice(0, 8).map((place) => `<span class="westbank-digest-chip">${escapeHtml(place)}</span>`).join('')}
          </div>
        </div>
      </div>
    `);
  }

  public setDigest(digest: WestBankDigestResponse, range: DigestTimeRange = 'all'): void {
    const sections = digest.sections
      .map((section) => ({
        ...section,
        items: filterDigestItemsByRange(section.items, range),
      }))
      .filter((section) => section.items.length > 0);

    const visibleItems = new Map<string, WestBankSourceItem>();
    sections.forEach((section) => {
      section.items.forEach((item) => visibleItems.set(item.id, item));
    });

    const items = [...visibleItems.values()];
    this.setCount(items.length);

    if (items.length === 0) {
      this.renderEmpty('No mapped West Bank incidents in the active time window.', digest.sourceHealth);
      return;
    }

    const sourceCount = new Set(items.map((item) => item.sourceId)).size;
    const topPlaces = [...new Set(items.map((item) => item.placeLabel).filter((place): place is string => !!place))].slice(0, 4);
    const health = getVisibleHealthEntries(digest.sourceHealth);

    const sectionHtml = sections.map((section) => {
      const lowConfidence = isLowConfidenceSection(section.key);
      const cards = section.items.map((item) => {
        const meta = [
          item.sourceName,
          formatRecency(new Date(item.publishedAt)),
          item.sourceCount ? `${item.sourceCount} source${item.sourceCount === 1 ? '' : 's'}` : null,
          item.placeLabel ?? null,
        ].filter((value): value is string => !!value);
        const mapTarget = getWestBankDigestMapTarget(item);
        const mapAction = mapTarget
          ? `<button type="button" class="westbank-digest-map-link" data-westbank-map-lat="${mapTarget.lat}" data-westbank-map-lon="${mapTarget.lon}">Show on map</button>`
          : '';

        return `
          <article class="westbank-digest-card westbank-digest-card--sectioned${lowConfidence ? ' westbank-digest-card--low-confidence' : ''}">
            <div class="westbank-digest-card-body">
              <div class="westbank-digest-card-head">
                ${renderThreatBadge(item.threatLevel ?? 'info')}
                ${renderVerificationBadge(item.verification)}
              </div>
              <a class="westbank-digest-title" href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener">
                ${escapeHtml(item.title)}
              </a>
              <div class="westbank-digest-meta">
                ${meta.map((value) => `<span class="westbank-digest-meta-item">${escapeHtml(value)}</span>`).join('')}
              </div>
              ${mapAction ? `<div class="westbank-digest-actions">${mapAction}</div>` : ''}
            </div>
          </article>
        `;
      }).join('');

      return `
        <section class="westbank-digest-section${lowConfidence ? ' westbank-digest-section--low-confidence' : ''}">
          <div class="westbank-digest-section-head">
            <h4 class="westbank-digest-section-title">${escapeHtml(section.label)}</h4>
            <span class="westbank-digest-chip">${section.items.length}</span>
          </div>
          ${lowConfidence ? '<p class="westbank-digest-section-note">Single-source or unresolved reporting. Treat as provisional until corroborated.</p>' : ''}
          <div class="westbank-digest-section-list">${cards}</div>
        </section>
      `;
    }).join('');

    this.setContent(`
      <div class="westbank-digest">
        <div class="westbank-digest-summary">
          <span class="westbank-digest-chip">${items.length} incident summaries</span>
          <span class="westbank-digest-chip">${sourceCount} sources</span>
          ${topPlaces.map((place) => `<span class="westbank-digest-chip">${escapeHtml(place)}</span>`).join('')}
        </div>
        ${renderHealthSummary(digest.sourceHealth)}
        ${health.length > 0 ? `<div class="westbank-health-row">${health.map(renderHealthChip).join('')}</div>` : ''}
        <div class="westbank-digest-sections">${sectionHtml}</div>
      </div>
    `);
  }

  public setItems(items: NewsItem[]): void {
    this.setCount(items.length);

    if (items.length === 0) {
      this.renderEmpty('No West Bank-specific headlines in the active time window.');
      return;
    }

    const sourceCount = new Set(items.map((item) => item.source)).size;
    const topPlaces = [...new Set(items.flatMap((item) => extractWestBankPlaces(item)))].slice(0, 4);

    const cards = items.map((item, index) => {
      const places = extractWestBankPlaces(item);
      const meta = [
        item.source,
        formatRecency(item.pubDate),
        ...places,
      ];

      return `
        <article class="westbank-digest-card">
          <div class="westbank-digest-card-index">${index + 1}</div>
          <div class="westbank-digest-card-body">
            <a class="westbank-digest-title" href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener">
              ${escapeHtml(item.title)}
            </a>
            <div class="westbank-digest-meta">
              ${meta.map((value) => `<span class="westbank-digest-meta-item">${escapeHtml(value)}</span>`).join('')}
            </div>
          </div>
        </article>
      `;
    }).join('');

    this.setContent(`
      <div class="westbank-digest">
        <div class="westbank-digest-summary">
          <span class="westbank-digest-chip">${items.length} relevant reports</span>
          <span class="westbank-digest-chip">${sourceCount} sources</span>
          ${topPlaces.map((place) => `<span class="westbank-digest-chip">${escapeHtml(place)}</span>`).join('')}
        </div>
        <div class="westbank-digest-list">${cards}</div>
      </div>
    `);
  }

  public setClusters(clusters: ClusteredEvent[]): void {
    this.setCount(clusters.length);

    if (clusters.length === 0) {
      this.renderEmpty('No mapped West Bank incidents in the active time window.');
      return;
    }

    const sourceCount = new Set(clusters.flatMap((cluster) => cluster.allItems.map((item) => item.source))).size;
    const topPlaces = [...new Set(clusters.flatMap((cluster) => extractWestBankPlacesFromCluster(cluster)))].slice(0, 4);

    const cards = clusters.map((cluster, index) => {
      const threatLevel = cluster.threat?.level ?? 'info';
      const places = extractWestBankPlacesFromCluster(cluster);
      const meta = [
        cluster.primarySource,
        formatRecency(cluster.lastUpdated),
        `${cluster.sourceCount} source${cluster.sourceCount === 1 ? '' : 's'}`,
        ...places,
      ];
      const link = cluster.primaryLink || cluster.allItems[0]?.link || '#';
      const threatCategory = cluster.threat?.category
        ? `<span class="westbank-digest-chip">${escapeHtml(cluster.threat.category.replace(/-/g, ' '))}</span>`
        : '';

      return `
        <article class="westbank-digest-card">
          <div class="westbank-digest-card-index">${index + 1}</div>
          <div class="westbank-digest-card-body">
            <div class="westbank-digest-card-head">
              ${renderThreatBadge(threatLevel)}
              ${threatCategory}
            </div>
            <a class="westbank-digest-title" href="${sanitizeUrl(link)}" target="_blank" rel="noopener">
              ${escapeHtml(cluster.primaryTitle)}
            </a>
            <div class="westbank-digest-meta">
              ${meta.map((value) => `<span class="westbank-digest-meta-item">${escapeHtml(value)}</span>`).join('')}
            </div>
          </div>
        </article>
      `;
    }).join('');

    this.setContent(`
      <div class="westbank-digest">
        <div class="westbank-digest-summary">
          <span class="westbank-digest-chip">${clusters.length} mapped incidents</span>
          <span class="westbank-digest-chip">${sourceCount} sources</span>
          ${topPlaces.map((place) => `<span class="westbank-digest-chip">${escapeHtml(place)}</span>`).join('')}
        </div>
        <div class="westbank-digest-list">${cards}</div>
      </div>
    `);
  }
}
