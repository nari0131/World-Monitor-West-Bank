import type { WestBankSourceDefinition } from '@/types';

function normalizeSourceName(value: string): string {
  return value.trim().toLowerCase();
}

export const WESTBANK_SOURCES: WestBankSourceDefinition[] = [
  {
    id: 'rss-wafa-english',
    name: 'WAFA English',
    type: 'rss',
    tier: 1,
    verification: 'corroborated',
    defaultEnabled: true,
    aliases: ['WAFA'],
    notes: 'Palestinian wire coverage in English.',
  },
  {
    id: 'rss-maan-news',
    name: 'Maan News',
    type: 'rss',
    tier: 1,
    verification: 'corroborated',
    defaultEnabled: true,
    aliases: ['Ma’an News', 'Ma an News'],
    notes: 'Local Palestinian media feed.',
  },
  {
    id: 'rss-972-magazine',
    name: '972 Magazine',
    type: 'rss',
    tier: 2,
    verification: 'single-source',
    defaultEnabled: true,
    aliases: ['+972 Magazine', '972'],
    notes: 'Feature-heavy local reporting.',
  },
  {
    id: 'rss-times-of-israel-wb',
    name: 'Times of Israel WB',
    type: 'rss',
    tier: 2,
    verification: 'single-source',
    defaultEnabled: true,
    aliases: ['Times of Israel West Bank', 'TOI WB'],
    notes: 'West Bank filtered TOI feed.',
  },
  {
    id: 'rss-jerusalem-post-wb',
    name: 'Jerusalem Post WB',
    type: 'rss',
    tier: 2,
    verification: 'single-source',
    defaultEnabled: true,
    aliases: ['Jerusalem Post West Bank', 'JPost WB'],
    notes: 'West Bank filtered JPost feed.',
  },
  {
    id: 'rss-palestine-chronicle',
    name: 'Palestine Chronicle',
    type: 'rss',
    tier: 2,
    verification: 'single-source',
    defaultEnabled: true,
    aliases: [],
    notes: 'Local and diaspora coverage with West Bank filtering.',
  },
  {
    id: 'telegram-intel',
    name: 'Telegram Intel',
    type: 'telegram',
    tier: 2,
    verification: 'single-source',
    defaultEnabled: true,
    aliases: ['Telegram', 'telegram-intel'],
    notes: 'Near-real-time Telegram relay output.',
  },
  {
    id: 'oref-sirens',
    name: 'Israel Sirens',
    type: 'oref',
    tier: 1,
    verification: 'official',
    defaultEnabled: true,
    aliases: ['OREF', 'Oref Sirens', 'Israel Alerts'],
    notes: 'Official OREF / Home Front Command alerts.',
  },
  {
    id: 'acled-westbank',
    name: 'ACLED West Bank',
    type: 'acled',
    tier: 1,
    verification: 'corroborated',
    defaultEnabled: true,
    aliases: ['ACLED'],
    notes: 'Structured conflict event feed.',
  },
  {
    id: 'gdelt-westbank',
    name: 'GDELT West Bank',
    type: 'gdelt',
    tier: 2,
    verification: 'unresolved',
    defaultEnabled: true,
    aliases: ['GDELT', 'Structured Events', 'gdelt-intel'],
    notes: 'Structured media signal feed.',
  },
];

export const WESTBANK_SOURCE_BY_ID = new Map(WESTBANK_SOURCES.map((source) => [source.id, source]));

const WESTBANK_SOURCE_NAME_INDEX = new Map<string, WestBankSourceDefinition>();
WESTBANK_SOURCES.forEach((source) => {
  const names = [source.name, ...(source.aliases ?? [])];
  names.forEach((name) => {
    WESTBANK_SOURCE_NAME_INDEX.set(normalizeSourceName(name), source);
  });
});

export const WESTBANK_LOCAL_SOURCE_NAMES = new Set(
  WESTBANK_SOURCES
    .filter((source) => source.type === 'rss')
    .map((source) => source.name),
);

export function getWestBankSourceById(id: string): WestBankSourceDefinition | undefined {
  return WESTBANK_SOURCE_BY_ID.get(id);
}

export function getWestBankSourceByName(name: string): WestBankSourceDefinition | undefined {
  return WESTBANK_SOURCE_NAME_INDEX.get(normalizeSourceName(name));
}
