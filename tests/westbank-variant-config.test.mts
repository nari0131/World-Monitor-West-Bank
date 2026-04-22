import test from 'node:test';
import assert from 'node:assert/strict';

import { VARIANT_META } from '../src/config/variant-meta.ts';
import {
  DEFAULT_PANELS as WESTBANK_DEFAULT_PANELS,
  WESTBANK_PANEL_KEYS,
  VARIANT_CONFIG as WESTBANK_VARIANT_CONFIG,
  WESTBANK_PANEL_NAMES,
  WESTBANK_SOURCE_REGION_LABEL_KEY,
} from '../src/config/variants/westbank.ts';

test('westbank variant config keeps a strict two-panel surface', () => {
  assert.deepEqual(Object.keys(WESTBANK_DEFAULT_PANELS), [...WESTBANK_PANEL_KEYS]);
  assert.equal(WESTBANK_VARIANT_CONFIG.name, 'westbank');
  assert.equal(WESTBANK_DEFAULT_PANELS.map?.name, WESTBANK_PANEL_NAMES.map);
  assert.equal(WESTBANK_DEFAULT_PANELS['westbank-digest']?.name, WESTBANK_PANEL_NAMES.digest);
});

test('westbank metadata reflects the final map and digest naming', () => {
  assert.ok(VARIANT_META.westbank.features.includes('Israel + OPT threat map'));
  assert.ok(VARIANT_META.westbank.features.includes(WESTBANK_PANEL_NAMES.digest));
});

test('westbank source region label key is explicit and stable', () => {
  assert.equal(WESTBANK_SOURCE_REGION_LABEL_KEY, 'header.sourceRegionWestBank');
});
