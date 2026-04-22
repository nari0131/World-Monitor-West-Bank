import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWestBankMapEvents,
  buildWestBankSections,
  clusterWestBankItems,
  createEmptyWestBankDigestResponse,
} from '../src/services/intelligence/westbank-cluster.ts';
import type { NormalizedWestBankItem } from '../src/services/intelligence/westbank-score.ts';

let itemCounter = 0;

function createItem(overrides: Partial<NormalizedWestBankItem> = {}): NormalizedWestBankItem {
  const baseTime = Date.parse('2026-04-22T12:00:00.000Z');

  return {
    id: `item-${++itemCounter}`,
    sourceId: 'rss-wafa-english',
    sourceName: 'WAFA English',
    sourceType: 'rss',
    sourceTier: 1,
    verification: 'single-source',
    sourceCount: 1,
    title: 'Raid reported near Jenin Camp',
    link: 'https://example.com/default',
    publishedAt: new Date(baseTime).toISOString(),
    publishedAtMs: baseTime,
    category: 'raid',
    threatLevel: 'high',
    placeId: 'jenin-camp',
    placeLabel: 'Jenin Camp',
    lat: 32.4605,
    lon: 35.2956,
    priorityScore: 500,
    excerpt: undefined,
    rawSourceName: 'WAFA English',
    ...overrides,
  };
}

test('clusterWestBankItems deduplicates repeated links and preserves corroboration', () => {
  const items: NormalizedWestBankItem[] = [
    createItem({ id: 'wafa-1', link: 'https://example.com/jenin-1', sourceId: 'rss-wafa-english', sourceName: 'WAFA English', verification: 'single-source' }),
    createItem({ id: 'wafa-dup', link: 'https://example.com/jenin-1', sourceId: 'rss-wafa-english', sourceName: 'WAFA English', verification: 'single-source', priorityScore: 490 }),
    createItem({ id: 'maan-1', link: 'https://example.com/jenin-2', sourceId: 'rss-maan-news', sourceName: 'Maan News', verification: 'single-source', priorityScore: 470 }),
  ];

  const clusters = clusterWestBankItems(items);

  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]?.items.length, 2);
  assert.equal(clusters[0]?.sourceCount, 2);
  assert.equal(clusters[0]?.verification, 'corroborated');
});

test('buildWestBankSections and map events expose the six-section digest shape', () => {
  const baseTime = Date.parse('2026-04-22T12:00:00.000Z');
  const clusters = clusterWestBankItems([
    createItem({ id: 'raid-1', publishedAtMs: baseTime - 30 * 60 * 1000, publishedAt: new Date(baseTime - 30 * 60 * 1000).toISOString() }),
    createItem({
      id: 'mobility-1',
      sourceId: 'rss-times-of-israel-wb',
      sourceName: 'Times of Israel WB',
      link: 'https://example.com/huwwara',
      category: 'mobility',
      threatLevel: 'medium',
      placeId: 'huwwara-checkpoint',
      placeLabel: 'Huwwara Checkpoint',
      lat: 32.1452,
      lon: 35.2827,
      verification: 'single-source',
      sourceTier: 2,
      publishedAtMs: baseTime - 3 * 60 * 60 * 1000,
      publishedAt: new Date(baseTime - 3 * 60 * 60 * 1000).toISOString(),
      priorityScore: 360,
    }),
  ]);

  const sections = buildWestBankSections(clusters, baseTime);
  const mapEvents = buildWestBankMapEvents(clusters);

  assert.equal(sections.length, 6);
  assert.ok(sections.find((section) => section.key === 'now')?.items.some((item) => item.placeLabel === 'Jenin Camp'));
  assert.ok(sections.find((section) => section.key === 'mobility')?.items.some((item) => item.placeLabel === 'Huwwara Checkpoint'));
  assert.ok(mapEvents.every((item) => item.lat != null && item.lon != null));
});

test('createEmptyWestBankDigestResponse returns the canonical empty payload shape', () => {
  const digest = createEmptyWestBankDigestResponse();

  assert.equal(digest.sections.length, 6);
  assert.deepEqual(digest.sourceHealth, []);
  assert.deepEqual(digest.mapEvents, []);
});
