import test from 'node:test';
import assert from 'node:assert/strict';

import type { ListFeedDigestResponse } from '../src/generated/server/worldmonitor/news/v1/service_server.ts';
import { normalizeWestBankSeedDigest } from '../src/services/intelligence/westbank-normalize.ts';

function createSeedDigest(): ListFeedDigestResponse {
  const now = Date.parse('2026-04-22T12:00:00.000Z');

  return {
    generatedAt: new Date(now).toISOString(),
    feedStatuses: {},
    categories: {
      westbank: {
        items: [
          {
            source: 'Israel Sirens',
            title: 'Home Front Command alert near Hebron checkpoint',
            link: 'https://example.com/oref-hebron',
            publishedAt: now - 5 * 60 * 1000,
            isAlert: true,
            threat: {
              level: 'THREAT_LEVEL_UNSPECIFIED',
              category: 'general',
              confidence: 0.9,
              source: 'keyword',
            },
            location: undefined,
            locationName: 'Hebron',
            importanceScore: 90,
            corroborationCount: 1,
            storyMeta: undefined,
          },
          {
            source: 'Unknown Desk',
            title: 'March reported in Jenin city center',
            link: 'https://example.com/unknown-jenin',
            publishedAt: now - 40 * 60 * 1000,
            isAlert: false,
            threat: {
              level: 'THREAT_LEVEL_LOW',
              category: 'protest',
              confidence: 0.5,
              source: 'keyword',
            },
            location: undefined,
            locationName: 'Jenin',
            importanceScore: 25,
            corroborationCount: 1,
            storyMeta: undefined,
          },
          {
            source: 'WAFA English',
            title: 'Aid convoy reaches Gaza City',
            link: 'https://example.com/gaza-aid',
            publishedAt: now - 15 * 60 * 1000,
            isAlert: false,
            threat: {
              level: 'THREAT_LEVEL_LOW',
              category: 'general',
              confidence: 0.4,
              source: 'keyword',
            },
            location: undefined,
            locationName: 'Gaza City',
            importanceScore: 18,
            corroborationCount: 1,
            storyMeta: undefined,
          },
        ],
      },
    },
  };
}

test('normalizeWestBankSeedDigest keeps West Bank-relevant items and drops Gaza-only coverage', () => {
  const items = normalizeWestBankSeedDigest(createSeedDigest());

  assert.equal(items.length, 2);
  assert.ok(items.every((item) => item.placeLabel !== 'Gaza City'));
});

test('normalizeWestBankSeedDigest preserves source typing and official alert classification', () => {
  const items = normalizeWestBankSeedDigest(createSeedDigest());
  const alertItem = items.find((item) => item.sourceName === 'Israel Sirens');

  assert.ok(alertItem);
  assert.equal(alertItem.sourceType, 'oref');
  assert.equal(alertItem.verification, 'official');
  assert.equal(alertItem.category, 'official-alert');
  assert.equal(alertItem.placeLabel, 'Hebron');
});

test('normalizeWestBankSeedDigest falls back safely for unknown sources', () => {
  const items = normalizeWestBankSeedDigest(createSeedDigest());
  const unknownItem = items.find((item) => item.sourceName === 'Unknown Desk');

  assert.ok(unknownItem);
  assert.equal(unknownItem.sourceId, 'unknown:unknown-desk');
  assert.equal(unknownItem.sourceType, 'rss');
  assert.equal(unknownItem.verification, 'unresolved');
  assert.equal(unknownItem.placeLabel, 'Jenin');
});
