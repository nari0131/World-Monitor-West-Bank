import test from 'node:test';
import assert from 'node:assert/strict';

import type { ListFeedDigestResponse } from '../src/generated/server/worldmonitor/news/v1/service_server.ts';
import {
  buildWestBankFailureSourceHealth,
  buildWestBankSourceHealth,
  classifyWestBankDigestFailure,
} from '../src/services/intelligence/westbank-source-health.ts';

function createSeedDigest(feedStatuses: Record<string, string> = {}): ListFeedDigestResponse {
  return {
    generatedAt: new Date('2026-04-22T12:00:00.000Z').toISOString(),
    feedStatuses,
    categories: {},
  };
}

test('buildWestBankSourceHealth marks stale RSS feeds without failing the digest', () => {
  const now = Date.parse('2026-04-22T12:00:00.000Z');
  const items = [{
    sourceId: 'rss-972-magazine',
    publishedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
  }];

  const health = buildWestBankSourceHealth(createSeedDigest(), items, now);
  const staleEntry = health.find((entry) => entry.sourceId === 'rss-972-magazine');

  assert.equal(staleEntry?.status, 'degraded');
  assert.equal(staleEntry?.code, 'stale_cache');
  assert.equal(staleEntry?.staleMinutes, 300);
});

test('classifyWestBankDigestFailure distinguishes relay and proxy failures', () => {
  assert.deepEqual(
    classifyWestBankDigestFailure(new Error('Railway relay unavailable for westbank digest')),
    {
      code: 'relay_unavailable',
      message: 'Railway relay unavailable for westbank digest',
    },
  );

  assert.deepEqual(
    classifyWestBankDigestFailure(new Error('RSS proxy missing for westbank digest')),
    {
      code: 'proxy_missing',
      message: 'RSS proxy missing for westbank digest',
    },
  );
});

test('buildWestBankFailureSourceHealth keeps optional feeds soft-failed', () => {
  const health = buildWestBankFailureSourceHealth(new Error('relay unavailable'));

  const wafaHealth = health.find((entry) => entry.sourceId === 'rss-wafa-english');
  assert.equal(wafaHealth?.status, 'down');
  assert.equal(wafaHealth?.code, 'relay_unavailable');

  const telegramHealth = health.find((entry) => entry.sourceId === 'telegram-intel');
  assert.equal(telegramHealth?.status, 'degraded');
  assert.equal(telegramHealth?.code, 'relay_unavailable');
});
