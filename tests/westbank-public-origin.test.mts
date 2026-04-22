import assert from 'node:assert/strict';
import test from 'node:test';

import { VARIANT_FEEDS } from '../server/worldmonitor/news/v1/_feeds.ts';
import { getCorsHeaders, isAllowedOrigin } from '../server/cors.ts';

test('server digest supports the westbank variant and feed set', () => {
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

test('public CORS logic allows the deployed West Bank Vercel origin', () => {
  const origin = 'https://world-monitor-west-bank.vercel.app';
  assert.equal(isAllowedOrigin(origin), true);

  const headers = getCorsHeaders(new Request(`${origin}/api/market/v1/list-market-quotes?symbols=AAPL`, {
    headers: { Origin: origin },
  }));
  assert.equal(headers['Access-Control-Allow-Origin'], origin);
});

test('public request metadata keeps the West Bank Vercel referer visible', () => {
  const req = new Request('https://world-monitor-west-bank.vercel.app/api/market/v1/list-market-quotes?symbols=AAPL', {
    headers: { Referer: 'https://world-monitor-west-bank.vercel.app/' },
  });

  assert.equal(new URL(req.headers.get('Referer') ?? '').origin, 'https://world-monitor-west-bank.vercel.app');
});
