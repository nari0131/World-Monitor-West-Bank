import { Panel } from './Panel';
import type { ClusteredEvent, NewsItem, ThreatLevel } from '@/types';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { extractWestBankPlaces, extractWestBankPlacesFromCluster, WESTBANK_WATCHLIST } from '@/config/westbank-focus';

const THREAT_LABELS: Record<ThreatLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

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

export class WestBankDigestPanel extends Panel {
  constructor() {
    super({
      id: 'westbank-digest',
      title: 'Incident & News Summary',
      showCount: true,
      trackActivity: false,
    });
    this.setContent('<div class="westbank-digest-empty">Waiting for West Bank incidents...</div>');
  }

  private renderEmpty(message: string): void {
    this.setCount(0);
    this.setContent(`
      <div class="westbank-digest">
        <div class="westbank-digest-empty">
          <p class="westbank-digest-empty-title">${escapeHtml(message)}</p>
          <div class="westbank-digest-watchlist">
            ${WESTBANK_WATCHLIST.slice(0, 8).map(place => `<span class="westbank-digest-chip">${escapeHtml(place)}</span>`).join('')}
          </div>
        </div>
      </div>
    `);
  }

  public setItems(items: NewsItem[]): void {
    this.setCount(items.length);

    if (items.length === 0) {
      this.renderEmpty('No West Bank-specific headlines in the active time window.');
      return;
    }

    const sourceCount = new Set(items.map(item => item.source)).size;
    const topPlaces = [...new Set(items.flatMap(item => extractWestBankPlaces(item)))].slice(0, 4);

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
              ${meta.map(value => `<span class="westbank-digest-meta-item">${escapeHtml(value)}</span>`).join('')}
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
          ${topPlaces.map(place => `<span class="westbank-digest-chip">${escapeHtml(place)}</span>`).join('')}
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

    const sourceCount = new Set(clusters.flatMap(cluster => cluster.allItems.map(item => item.source))).size;
    const topPlaces = [...new Set(clusters.flatMap(cluster => extractWestBankPlacesFromCluster(cluster)))].slice(0, 4);

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
              ${meta.map(value => `<span class="westbank-digest-meta-item">${escapeHtml(value)}</span>`).join('')}
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
          ${topPlaces.map(place => `<span class="westbank-digest-chip">${escapeHtml(place)}</span>`).join('')}
        </div>
        <div class="westbank-digest-list">${cards}</div>
      </div>
    `);
  }
}
