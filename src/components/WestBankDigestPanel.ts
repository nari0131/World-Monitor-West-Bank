import { Panel } from './Panel';
import type { NewsItem } from '@/types';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { extractWestBankPlaces, WESTBANK_WATCHLIST } from '@/config/westbank-focus';

function formatRecency(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 48) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

export class WestBankDigestPanel extends Panel {
  constructor() {
    super({
      id: 'westbank-digest',
      title: 'West Bank Digest',
      showCount: true,
      trackActivity: false,
    });
    this.setContent('<div class="westbank-digest-empty">Waiting for West Bank signals...</div>');
  }

  public setItems(items: NewsItem[]): void {
    this.setCount(items.length);

    if (items.length === 0) {
      this.setContent(`
        <div class="westbank-digest-empty">
          <p class="westbank-digest-empty-title">No West Bank-specific headlines in the active time window.</p>
          <div class="westbank-digest-watchlist">
            ${WESTBANK_WATCHLIST.slice(0, 8).map(place => `<span class="westbank-digest-chip">${escapeHtml(place)}</span>`).join('')}
          </div>
        </div>
      `);
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
          <span class="westbank-digest-chip">${items.length} relevant headlines</span>
          <span class="westbank-digest-chip">${sourceCount} sources</span>
          ${topPlaces.map(place => `<span class="westbank-digest-chip">${escapeHtml(place)}</span>`).join('')}
        </div>
        <div class="westbank-digest-list">${cards}</div>
      </div>
    `);
  }
}
