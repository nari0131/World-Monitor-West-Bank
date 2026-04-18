import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { NewsItem } from '../src/types/index.ts';
import {
  extractWestBankPlaces,
  isWestBankRelevant,
  scoreWestBankRelevance,
  selectWestBankDigestItems,
} from '../src/config/westbank-focus.ts';

function newsItem(overrides: Partial<NewsItem>): NewsItem {
  return {
    source: 'Reuters World',
    title: 'Placeholder headline',
    link: `https://example.com/${Math.random()}`,
    pubDate: new Date('2026-04-18T12:00:00Z'),
    isAlert: false,
    ...overrides,
  };
}

describe('westbank-focus helpers', () => {
  it('matches direct West Bank locations', () => {
    const item = newsItem({
      source: 'WAFA English',
      title: 'Israeli forces raid Jenin camp in the occupied West Bank',
    });

    assert.ok(isWestBankRelevant(item));
    assert.ok(scoreWestBankRelevance(item) >= 8);
    assert.deepStrictEqual(extractWestBankPlaces(item), ['Jenin']);
  });

  it('keeps unrelated Gaza-only headlines out of the digest', () => {
    const item = newsItem({
      title: 'Aid talks continue in Gaza as ceasefire pressure mounts',
    });

    assert.equal(isWestBankRelevant(item), false);
  });

  it('treats settlement and checkpoint coverage as relevant even without a city match', () => {
    const item = newsItem({
      source: 'Times of Israel WB',
      title: 'New checkpoint restrictions imposed after settler violence overnight',
    });

    assert.ok(isWestBankRelevant(item));
  });

  it('selects the strongest headlines first and deduplicates repeated links', () => {
    const strongest = newsItem({
      source: 'WAFA English',
      title: 'Ramallah and Jenin see raids across the occupied West Bank',
      link: 'https://example.com/strongest',
    });
    const duplicate = newsItem({
      source: 'WAFA English',
      title: 'Duplicate link should be removed',
      link: 'https://example.com/strongest',
    });
    const secondary = newsItem({
      source: 'Jerusalem Post WB',
      title: 'Settler attack reported near Nablus checkpoint',
      link: 'https://example.com/secondary',
    });
    const irrelevant = newsItem({
      title: 'Commodity prices rise as traders watch the Fed',
      link: 'https://example.com/irrelevant',
    });

    const selected = selectWestBankDigestItems([secondary, duplicate, irrelevant, strongest], 5);

    assert.deepStrictEqual(
      selected.map(item => item.link),
      ['https://example.com/strongest', 'https://example.com/secondary'],
    );
  });
});
