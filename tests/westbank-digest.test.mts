import test from 'node:test';
import assert from 'node:assert/strict';

import type { ListFeedDigestResponse } from '../src/generated/server/worldmonitor/news/v1/service_server.ts';
import { buildWestBankDigestFromSeed } from '../src/services/intelligence/westbank-digest-builder.ts';

function createSeedDigest(): ListFeedDigestResponse {
  const now = Date.now();

  return {
    generatedAt: new Date(now).toISOString(),
    feedStatuses: {
      'Palestine Chronicle': 'empty',
      'Jerusalem Post WB': 'timeout',
    },
    categories: {
      westbank: {
        items: [
          {
            source: 'WAFA English',
            title: 'Israeli forces raid Jenin Camp overnight',
            link: 'https://example.com/wafa-jenin',
            publishedAt: now - 20 * 60 * 1000,
            isAlert: true,
            threat: {
              level: 'THREAT_LEVEL_HIGH',
              category: 'conflict',
              confidence: 0.9,
              source: 'keyword',
            },
            location: undefined,
            locationName: 'Jenin Camp',
            importanceScore: 88,
            corroborationCount: 1,
            storyMeta: undefined,
          },
          {
            source: 'Maan News',
            title: 'Raid in Jenin Camp leaves roads blocked',
            link: 'https://example.com/maan-jenin',
            publishedAt: now - 15 * 60 * 1000,
            isAlert: true,
            threat: {
              level: 'THREAT_LEVEL_HIGH',
              category: 'conflict',
              confidence: 0.82,
              source: 'keyword',
            },
            location: undefined,
            locationName: 'Jenin',
            importanceScore: 81,
            corroborationCount: 1,
            storyMeta: undefined,
          },
          {
            source: 'Times of Israel WB',
            title: 'Checkpoint restrictions tightened at Huwwara',
            link: 'https://example.com/toi-huwwara',
            publishedAt: now - 70 * 60 * 1000,
            isAlert: false,
            threat: {
              level: 'THREAT_LEVEL_LOW',
              category: 'general',
              confidence: 0.7,
              source: 'keyword',
            },
            location: undefined,
            locationName: 'Huwwara Checkpoint',
            importanceScore: 45,
            corroborationCount: 1,
            storyMeta: undefined,
          },
          {
            source: '972 Magazine',
            title: 'Settlers torch vehicles near Hebron',
            link: 'https://example.com/972-hebron',
            publishedAt: now - 4 * 60 * 60 * 1000,
            isAlert: false,
            threat: {
              level: 'THREAT_LEVEL_MEDIUM',
              category: 'conflict',
              confidence: 0.75,
              source: 'keyword',
            },
            location: undefined,
            locationName: 'Hebron',
            importanceScore: 62,
            corroborationCount: 1,
            storyMeta: undefined,
          },
        ],
      },
    },
  };
}

test('buildWestBankDigestFromSeed clusters incidents and derives sections', () => {
  const digest = buildWestBankDigestFromSeed(createSeedDigest());

  assert.equal(digest.sections.length, 6);
  const nowSection = digest.sections.find((section) => section.key === 'now');
  assert.ok(nowSection);
  assert.equal(nowSection.items[0]?.placeLabel, 'Jenin Camp');
  assert.equal(nowSection.items[0]?.sourceCount, 2);
  assert.equal(nowSection.items[0]?.verification, 'corroborated');

  const mobilitySection = digest.sections.find((section) => section.key === 'mobility');
  assert.ok(mobilitySection?.items.some((item) => item.placeLabel === 'Huwwara Checkpoint'));

  const settlerSection = digest.sections.find((section) => section.key === 'settlerViolence');
  assert.ok(settlerSection?.items.some((item) => item.placeLabel === 'Hebron'));

  assert.ok(digest.mapEvents.every((item) => item.lat != null && item.lon != null));
});

test('buildWestBankDigestFromSeed exposes source health and degraded integrations', () => {
  const digest = buildWestBankDigestFromSeed(createSeedDigest());

  const wafaHealth = digest.sourceHealth.find((entry) => entry.sourceName === 'WAFA English');
  assert.equal(wafaHealth?.status, 'ok');
  assert.equal(wafaHealth?.code, 'healthy');

  const chronicleHealth = digest.sourceHealth.find((entry) => entry.sourceName === 'Palestine Chronicle');
  assert.equal(chronicleHealth?.status, 'degraded');
  assert.equal(chronicleHealth?.code, 'empty_window');

  const jpostHealth = digest.sourceHealth.find((entry) => entry.sourceName === 'Jerusalem Post WB');
  assert.equal(jpostHealth?.status, 'down');
  assert.equal(jpostHealth?.code, 'upstream_timeout');

  const telegramHealth = digest.sourceHealth.find((entry) => entry.sourceName === 'Telegram Intel');
  assert.equal(telegramHealth?.status, 'degraded');
  assert.equal(telegramHealth?.code, 'pending_integration');
});
