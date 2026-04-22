import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWestBankDigestFromSeed,
  createWestBankDigestFailureResponse,
  getRequestOrigin,
} from '../api/westbank-digest.ts';

test('west bank digest api helper builds sections, markers, and source health from seed data', () => {
  const now = Date.parse('2026-04-22T11:40:00.000Z');
  const digest = buildWestBankDigestFromSeed({
    generatedAt: new Date(now).toISOString(),
    categories: {
      breaking: {
        items: [
          {
            title: 'Israeli forces raid Jenin Camp overnight',
            source: 'WAFA English',
            link: 'https://example.com/jenin',
            locationName: 'Jenin Camp',
            publishedAt: now - 5 * 60_000,
            threat: {
              level: 'THREAT_LEVEL_HIGH',
              category: 'conflict',
            },
          },
          {
            title: 'Checkpoint closure reported near Nablus',
            source: 'Maan News',
            link: 'https://example.com/nablus',
            locationName: 'Nablus',
            publishedAt: now - 15 * 60_000,
            threat: {
              level: 'THREAT_LEVEL_MEDIUM',
              category: 'conflict',
            },
          },
        ],
      },
    },
    feedStatuses: {
      'WAFA English': 'ok',
      'Maan News': 'ok',
      '972 Magazine': 'empty',
    },
  }, now);

  assert.equal(digest.sections.length, 6);
  assert.equal(digest.mapEvents.length >= 2, true);
  assert.equal(digest.sections.find((section) => section.key === 'now')?.items[0]?.placeLabel, 'Jenin Camp');
  assert.equal(digest.sourceHealth.find((source) => source.sourceName === 'WAFA English')?.code, 'healthy');
  assert.equal(digest.sourceHealth.find((source) => source.sourceName === '972 Magazine')?.code, 'empty_window');
});

test('west bank digest api helper classifies failure mode into source health', () => {
  const digest = createWestBankDigestFailureResponse(new Error('relay unavailable'));

  assert.equal(digest.sections.every((section) => section.items.length === 0), true);
  assert.equal(digest.mapEvents.length, 0);
  assert.equal(digest.sourceHealth.every((source) => source.code === 'relay_unavailable'), true);
});

test('west bank digest api helper prefers forwarded host metadata for same-origin fetches', () => {
  const origin = getRequestOrigin({
    headers: {
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'world-monitor-west-bank.vercel.app',
    },
  });

  assert.equal(origin, 'https://world-monitor-west-bank.vercel.app');
});
