import test from 'node:test';
import assert from 'node:assert/strict';

import { getWestBankDigestMapTarget, isLowConfidenceSection } from '../src/components/westbank-digest-helpers.ts';

test('isLowConfidenceSection only flags the low confidence bucket', () => {
  assert.equal(isLowConfidenceSection('lowConfidence'), true);
  assert.equal(isLowConfidenceSection('now'), false);
  assert.equal(isLowConfidenceSection('officialAlerts'), false);
});

test('getWestBankDigestMapTarget returns finite coordinates only', () => {
  assert.deepEqual(
    getWestBankDigestMapTarget({ lat: 32.2211, lon: 35.2544 }),
    { lat: 32.2211, lon: 35.2544 },
  );
  assert.equal(getWestBankDigestMapTarget({ lat: undefined, lon: 35.2544 }), null);
  assert.equal(getWestBankDigestMapTarget({ lat: Number.NaN, lon: 35.2544 }), null);
});
