import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WESTBANK_WATCHLIST,
  findWestBankPlaceMatches,
  findWestBankPlacesInText,
} from '../src/config/westbank-places.ts';

test('camp aliases win over parent town matches', () => {
  const labels = findWestBankPlacesInText('Israeli forces raided Jenin camp before dawn').map((place) => place.label);
  assert.deepStrictEqual(labels, ['Jenin Camp']);
});

test('matches Arabic and Hebrew aliases from the place registry', () => {
  const arabicLabels = findWestBankPlacesInText('اقتحام في مخيم نور شمس قرب طولكرم').map((place) => place.label);
  assert.deepStrictEqual(arabicLabels, ['Nur Shams Camp', 'Tulkarm']);

  const hebrewLabels = findWestBankPlacesInText('עימותים במזרח ירושלים').map((place) => place.label);
  assert.deepStrictEqual(hebrewLabels, ['East Jerusalem']);
});

test('generic Jerusalem does not collide with East Jerusalem matching', () => {
  const labels = findWestBankPlacesInText('Jerusalem municipal officials met overnight').map((place) => place.label);
  assert.deepStrictEqual(labels, []);
});

test('watchlist remains focused on major overview locations', () => {
  assert.ok(WESTBANK_WATCHLIST.includes('Jenin'));
  assert.ok(WESTBANK_WATCHLIST.includes('East Jerusalem'));
  assert.equal(WESTBANK_WATCHLIST.includes('Jenin Camp'), false);
});

test('place match metadata preserves the matched alias and offsets', () => {
  const matches = findWestBankPlaceMatches('Qalandia checkpoint remained closed for hours');
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.label, 'Qalandia Checkpoint');
  assert.equal(matches[0]?.alias, 'Qalandia Checkpoint');
  assert.equal(matches[0]?.start, 0);
});
