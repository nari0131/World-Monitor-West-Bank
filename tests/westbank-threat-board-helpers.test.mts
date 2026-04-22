import test from 'node:test';
import assert from 'node:assert/strict';

import { flattenThreatBoardItems, summarizeSourceHealth } from '../src/westbank-threat-board/helpers.ts';

test('flattenThreatBoardItems merges mapped and section entries by id', () => {
  const items = flattenThreatBoardItems({
    generatedAt: '2026-04-22T12:00:00.000Z',
    sections: [
      {
        key: 'now',
        label: 'Now',
        items: [
          {
            id: 'jenin-1',
            sourceId: 'rss-wafa-english',
            sourceName: 'WAFA English',
            sourceType: 'rss',
            verification: 'official',
            title: 'Raid reported in Jenin Camp',
            link: 'https://example.com/jenin',
            publishedAt: '2026-04-22T11:00:00.000Z',
            threatLevel: 'high',
            sourceCount: 2,
          },
        ],
      },
      {
        key: 'mobility',
        label: 'Mobility',
        items: [
          {
            id: 'checkpoint-1',
            sourceId: 'telegram-intel',
            sourceName: 'Telegram Intel',
            sourceType: 'telegram',
            verification: 'single-source',
            title: 'Checkpoint congestion near Nablus',
            link: 'https://example.com/nablus',
            publishedAt: '2026-04-22T10:00:00.000Z',
            threatLevel: 'medium',
            sourceCount: 1,
          },
        ],
      },
    ],
    sourceHealth: [],
    mapEvents: [
      {
        id: 'jenin-1',
        sourceId: 'rss-wafa-english',
        sourceName: 'WAFA English',
        sourceType: 'rss',
        verification: 'official',
        title: 'Raid reported in Jenin Camp',
        link: 'https://example.com/jenin',
        publishedAt: '2026-04-22T11:00:00.000Z',
        threatLevel: 'high',
        sourceCount: 3,
        placeId: 'jenin-camp',
        placeLabel: 'Jenin Camp',
        lat: 32.4605,
        lon: 35.2956,
      },
    ],
  });

  assert.equal(items.length, 2);
  assert.equal(items[0]?.id, 'jenin-1');
  assert.equal(items[0]?.isMapped, true);
  assert.deepEqual(items[0]?.sectionKeys, ['now', 'mapped']);
  assert.equal(items[0]?.sourceCount, 3);
  assert.equal(items[0]?.placeLabel, 'Jenin Camp');
});

test('flattenThreatBoardItems sorts by threat before age', () => {
  const items = flattenThreatBoardItems({
    generatedAt: '2026-04-22T12:00:00.000Z',
    sections: [
      {
        key: 'now',
        label: 'Now',
        items: [
          {
            id: 'critical-1',
            sourceId: 'source-a',
            sourceName: 'Source A',
            sourceType: 'rss',
            verification: 'official',
            title: 'Critical incident',
            link: 'https://example.com/a',
            publishedAt: '2026-04-22T09:00:00.000Z',
            threatLevel: 'critical',
          },
          {
            id: 'high-1',
            sourceId: 'source-b',
            sourceName: 'Source B',
            sourceType: 'rss',
            verification: 'official',
            title: 'High incident',
            link: 'https://example.com/b',
            publishedAt: '2026-04-22T11:30:00.000Z',
            threatLevel: 'high',
          },
        ],
      },
    ],
    sourceHealth: [],
    mapEvents: [],
  });

  assert.deepEqual(
    items.map((item) => item.id),
    ['critical-1', 'high-1'],
  );
});

test('summarizeSourceHealth counts statuses', () => {
  assert.deepEqual(
    summarizeSourceHealth([
      { sourceId: 'a', sourceName: 'A', status: 'ok', code: 'healthy' },
      { sourceId: 'b', sourceName: 'B', status: 'degraded', code: 'stale_cache' },
      { sourceId: 'c', sourceName: 'C', status: 'degraded', code: 'relay_unavailable' },
      { sourceId: 'd', sourceName: 'D', status: 'down', code: 'digest_unavailable' },
    ]),
    { ok: 1, degraded: 2, down: 1 },
  );
});
