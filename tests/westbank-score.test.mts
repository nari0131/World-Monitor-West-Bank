import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareThreatLevels,
  deriveVerification,
  scoreWestBankItemPriority,
} from '../src/services/intelligence/westbank-score.ts';

test('deriveVerification prefers official and then corroborated sources', () => {
  assert.equal(
    deriveVerification([
      { verification: 'single-source', sourceId: 'rss-wafa-english' },
      { verification: 'official', sourceId: 'oref-sirens' },
    ]),
    'official',
  );

  assert.equal(
    deriveVerification([
      { verification: 'single-source', sourceId: 'rss-wafa-english' },
      { verification: 'single-source', sourceId: 'rss-maan-news' },
    ]),
    'corroborated',
  );
});

test('scoreWestBankItemPriority favors high-severity fresher items', () => {
  const now = Date.parse('2026-04-22T12:00:00.000Z');
  const originalNow = Date.now;
  Date.now = () => now;

  try {
    const strong = scoreWestBankItemPriority({
      threatLevel: 'high',
      sourceTier: 1,
      verification: 'official',
      publishedAtMs: now - 5 * 60 * 1000,
    });
    const weak = scoreWestBankItemPriority({
      threatLevel: 'low',
      sourceTier: 3,
      verification: 'unresolved',
      publishedAtMs: now - 6 * 60 * 60 * 1000,
    });

    assert.ok(strong > weak);
  } finally {
    Date.now = originalNow;
  }
});

test('compareThreatLevels orders critical above low and info', () => {
  assert.ok(compareThreatLevels('critical', 'low') > 0);
  assert.ok(compareThreatLevels('medium', 'info') > 0);
  assert.equal(compareThreatLevels('low', 'low'), 0);
});
