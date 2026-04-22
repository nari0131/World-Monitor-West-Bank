import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWestBankThreatMarkers } from '../src/services/intelligence/westbank-threat-markers.ts';

test('buildWestBankThreatMarkers keeps geolocated digest events with westbank metadata', () => {
  const markers = buildWestBankThreatMarkers([
    {
      id: 'jenin-1',
      sourceId: 'wafa-en',
      sourceName: 'WAFA English',
      sourceType: 'rss',
      verification: 'official',
      sourceCount: 3,
      title: 'Israeli forces raid Jenin Camp',
      link: 'https://example.com/jenin',
      publishedAt: '2026-04-22T09:05:00.000Z',
      threatLevel: 'high',
      category: 'raid',
      placeId: 'jenin-camp',
      placeLabel: 'Jenin Camp',
      lat: 32.4605,
      lon: 35.2956,
      excerpt: 'Road closures reported near the camp entrance.',
    },
  ]);

  assert.equal(markers.length, 1);
  assert.deepEqual(markers[0], {
    id: 'jenin-1',
    lat: 32.4605,
    lon: 35.2956,
    title: 'Israeli forces raid Jenin Camp',
    sourceName: 'WAFA English',
    verification: 'official',
    sourceCount: 3,
    threatLevel: 'high',
    publishedAt: '2026-04-22T09:05:00.000Z',
    url: 'https://example.com/jenin',
    placeLabel: 'Jenin Camp',
    category: 'raid',
    excerpt: 'Road closures reported near the camp entrance.',
  });
});

test('buildWestBankThreatMarkers drops non-geolocated events and fills safe defaults', () => {
  const markers = buildWestBankThreatMarkers([
    {
      id: 'no-geo',
      sourceId: 'maan',
      sourceName: 'Maan News',
      sourceType: 'rss',
      verification: 'single-source',
      title: 'Arrests reported overnight',
      link: 'https://example.com/no-geo',
      publishedAt: '2026-04-22T09:05:00.000Z',
    },
    {
      id: 'nablus-1',
      sourceId: 'telegram-intel',
      sourceName: 'Telegram Intel',
      sourceType: 'telegram',
      verification: 'unresolved',
      title: 'Clashes reported near Nablus',
      link: 'https://example.com/nablus',
      publishedAt: '2026-04-22T09:15:00.000Z',
      lat: 32.2211,
      lon: 35.2544,
    },
  ]);

  assert.equal(markers.length, 1);
  assert.equal(markers[0]?.threatLevel, 'info');
  assert.equal(markers[0]?.sourceCount, 1);
  assert.equal(markers[0]?.verification, 'unresolved');
});
