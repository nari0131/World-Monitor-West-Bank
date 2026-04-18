import assert from 'node:assert/strict';
import test from 'node:test';

import { VALID_VARIANTS } from '../server/worldmonitor/news/v1/list-feed-digest.ts';
import { VARIANT_FEEDS } from '../server/worldmonitor/news/v1/_feeds.ts';
import { createDomainGateway } from '../server/gateway.ts';

test('server digest supports the westbank variant and feed set', () => {
  assert.equal(VALID_VARIANTS.has('westbank'), true);
  const feeds = VARIANT_FEEDS.westbank?.westbank ?? [];
  assert.equal(feeds.length >= 6, true);
  assert.deepEqual(
    feeds.map((feed) => feed.name),
    [
      'WAFA English',
      'Maan News',
      '972 Magazine',
      'Times of Israel WB',
      'Jerusalem Post WB',
      'Palestine Chronicle',
    ],
  );
});

test('public routes allow the deployed West Bank Vercel origin', async () => {
  const handler = createDomainGateway([
    {
      method: 'GET',
      path: '/api/market/v1/list-market-quotes',
      handler: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    },
  ]);

  const byOrigin = await handler(new Request('https://world-monitor-west-bank.vercel.app/api/market/v1/list-market-quotes?symbols=AAPL', {
    headers: { Origin: 'https://world-monitor-west-bank.vercel.app' },
  }));
  assert.equal(byOrigin.status, 200);

  const byReferer = await handler(new Request('https://world-monitor-west-bank.vercel.app/api/market/v1/list-market-quotes?symbols=AAPL', {
    headers: { Referer: 'https://world-monitor-west-bank.vercel.app/' },
  }));
  assert.equal(byReferer.status, 200);
});
