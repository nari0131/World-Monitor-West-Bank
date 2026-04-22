import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ClusteredEvent, NewsItem } from '../src/types/index.ts';
import {
  extractWestBankPlaces,
  extractWestBankPlacesFromCluster,
  isWestBankRelevant,
  scoreWestBankRelevance,
  selectWestBankDigestItems,
  selectWestBankThreatClusters,
} from '../src/config/westbank-focus.ts';

let nextId = 0;

function newsItem(overrides: Partial<NewsItem>): NewsItem {
  return {
    source: 'Reuters World',
    title: 'Placeholder headline',
    link: `https://example.com/item-${nextId++}`,
    pubDate: new Date('2026-04-18T12:00:00Z'),
    isAlert: false,
    ...overrides,
  };
}

function cluster(overrides: Partial<ClusteredEvent>): ClusteredEvent {
  const seed = newsItem({});
  return {
    id: `cluster-${nextId++}`,
    primaryTitle: seed.title,
    primarySource: seed.source,
    primaryLink: seed.link,
    sourceCount: 1,
    topSources: [{ name: seed.source, tier: 1, url: seed.link }],
    allItems: [seed],
    firstSeen: new Date('2026-04-18T11:00:00Z'),
    lastUpdated: new Date('2026-04-18T12:00:00Z'),
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
    assert.deepStrictEqual(extractWestBankPlaces(item), ['Jenin Camp']);
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

  it('keeps the incident summary aligned to mapped West Bank threat clusters', () => {
    const jeninCluster = cluster({
      primaryTitle: 'Israeli forces raid Jenin camp in the occupied West Bank',
      primarySource: 'WAFA English',
      primaryLink: 'https://example.com/jenin-cluster',
      sourceCount: 3,
      topSources: [
        { name: 'WAFA English', tier: 1, url: 'https://example.com/jenin-cluster' },
        { name: 'Maan News', tier: 1, url: 'https://example.com/jenin-maan' },
      ],
      allItems: [
        newsItem({
          source: 'WAFA English',
          title: 'Israeli forces raid Jenin camp in the occupied West Bank',
          link: 'https://example.com/jenin-cluster',
        }),
        newsItem({
          source: 'Maan News',
          title: 'Jenin raid leaves several injured in refugee camp',
          link: 'https://example.com/jenin-maan',
        }),
      ],
      lastUpdated: new Date('2026-04-18T12:30:00Z'),
      threat: { level: 'critical', category: 'conflict', confidence: 0.9, source: 'keyword' },
      lat: 32.4615,
      lon: 35.2939,
    });
    const bethlehemCluster = cluster({
      primaryTitle: 'Checkpoint restrictions tighten near Bethlehem overnight',
      primarySource: 'Jerusalem Post WB',
      primaryLink: 'https://example.com/bethlehem-cluster',
      sourceCount: 2,
      allItems: [
        newsItem({
          source: 'Jerusalem Post WB',
          title: 'Checkpoint restrictions tighten near Bethlehem overnight',
          link: 'https://example.com/bethlehem-cluster',
        }),
      ],
      threat: { level: 'medium', category: 'conflict', confidence: 0.7, source: 'keyword' },
      lat: 31.7054,
      lon: 35.2024,
    });
    const irrelevantCluster = cluster({
      primaryTitle: 'Commodity traders await the next Fed decision',
      primarySource: 'Reuters World',
      primaryLink: 'https://example.com/fed-cluster',
      threat: { level: 'high', category: 'economic', confidence: 0.8, source: 'keyword' },
      lat: 40.7128,
      lon: -74.006,
    });

    const selected = selectWestBankThreatClusters([bethlehemCluster, irrelevantCluster, jeninCluster], 5);

    assert.deepStrictEqual(
      selected.map(item => item.primaryLink),
      ['https://example.com/jenin-cluster', 'https://example.com/bethlehem-cluster'],
    );
    assert.deepStrictEqual(extractWestBankPlacesFromCluster(jeninCluster), ['Jenin Camp']);
  });
});
