import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveHostedVariant } from '../src/config/variant.ts';

test('West Bank hosts resolve to the westbank variant', () => {
  assert.equal(resolveHostedVariant('westbank.worldmonitor.app', 'full'), 'westbank');
  assert.equal(resolveHostedVariant('world-monitor-west-bank.vercel.app', 'full'), 'westbank');
  assert.equal(
    resolveHostedVariant('world-monitor-west-bank-uw9rz2jel-nari0131s-projects.vercel.app', 'full'),
    'westbank',
  );
});

test('other vercel previews fall back to the build variant', () => {
  assert.equal(resolveHostedVariant('custom-preview.vercel.app', 'westbank'), 'westbank');
  assert.equal(resolveHostedVariant('custom-preview.vercel.app', 'full'), 'full');
});
