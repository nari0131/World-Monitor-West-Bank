import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWestBankDigestFromSeed,
  buildWestBankDigestFromSeedWithAi,
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

test('west bank digest api helper applies AI classification and summaries fail-soft', async () => {
  const now = Date.parse('2026-04-22T11:40:00.000Z');
  const digest = await buildWestBankDigestFromSeedWithAi({
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
    },
  }, {
    now,
    lang: 'en',
    classifyItem: async (item) => {
      if (item.placeId === 'jenin-camp') {
        return { threatLevel: 'critical', category: 'raid' };
      }

      throw new Error('skip non-primary item');
    },
    summarizeCluster: async (cluster) => {
      if (cluster.placeId === 'jenin-camp') {
        return 'AI summary: raid pressure remains concentrated around Jenin Camp.';
      }

      throw new Error('summary unavailable');
    },
  });

  const nowSection = digest.sections.find((section) => section.key === 'now');
  assert.equal(nowSection?.items[0]?.placeLabel, 'Jenin Camp');
  assert.equal(nowSection?.items[0]?.threatLevel, 'critical');
  assert.equal(nowSection?.items[0]?.category, 'raid');
  assert.match(nowSection?.items[0]?.excerpt ?? '', /AI summary:/);

  const mappedJenin = digest.mapEvents.find((item) => item.placeLabel === 'Jenin Camp');
  assert.match(mappedJenin?.excerpt ?? '', /AI summary:/);

  const nablusItem = digest.sections
    .flatMap((section) => section.items)
    .find((item) => item.placeLabel === 'Nablus');
  assert.equal(nablusItem?.excerpt, undefined);
});
