import type {
  ClassifyEventResponse,
  ServerContext as IntelligenceServerContext,
} from '../src/generated/server/worldmonitor/intelligence/v1/service_server.ts';
import type {
  ServerContext as NewsServerContext,
  SummarizeArticleResponse,
} from '../src/generated/server/worldmonitor/news/v1/service_server.ts';

export const config = { runtime: 'nodejs' };

type VerificationClass = 'official' | 'corroborated' | 'single-source' | 'unresolved';
type WestBankSourceType = 'rss' | 'telegram' | 'oref' | 'acled' | 'gdelt';
type WestBankThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
type WestBankEventCategory =
  | 'conflict'
  | 'protest'
  | 'mobility'
  | 'settler-violence'
  | 'official-alert'
  | 'raid'
  | 'arrest'
  | 'demolition'
  | 'general';
type WestBankDigestSectionKey =
  | 'now'
  | 'last6h'
  | 'mobility'
  | 'settlerViolence'
  | 'officialAlerts'
  | 'lowConfidence';
type WestBankSourceHealthStatus = 'ok' | 'degraded' | 'down';
type WestBankSourceHealthCode =
  | 'healthy'
  | 'pending_integration'
  | 'empty_window'
  | 'no_mapped_items'
  | 'stale_cache'
  | 'upstream_timeout'
  | 'relay_unavailable'
  | 'proxy_missing'
  | 'digest_unavailable';

type NodeRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};

type NodeResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): NodeResponse;
  send(body: string): void;
  end(body?: string): void;
};

type SeedDigestItem = {
  title: string;
  source: string;
  link: string;
  publishedAt?: number;
  locationName?: string;
  corroborationCount?: number;
  importanceScore?: number;
  threat?: {
    level?: string;
    category?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

type SeedDigest = {
  generatedAt?: string;
  categories?: Record<string, { items?: SeedDigestItem[] }>;
  feedStatuses?: Record<string, string | undefined>;
};

type WestBankSourceDefinition = {
  id: string;
  name: string;
  type: WestBankSourceType;
  tier: 1 | 2 | 3;
  verification: VerificationClass;
  aliases?: string[];
};

type WestBankPlaceDefinition = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  aliases: string[];
};

type WestBankSourceItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: WestBankSourceType;
  verification: VerificationClass;
  sourceCount?: number;
  title: string;
  link: string;
  publishedAt: string;
  category?: WestBankEventCategory;
  threatLevel?: WestBankThreatLevel;
  placeId?: string;
  placeLabel?: string;
  lat?: number;
  lon?: number;
  excerpt?: string;
  rawSourceName?: string;
};

type WestBankSourceHealth = {
  sourceId: string;
  sourceName: string;
  status: WestBankSourceHealthStatus;
  code: WestBankSourceHealthCode;
  staleMinutes?: number;
  message?: string;
};

type WestBankDigestSection = {
  key: WestBankDigestSectionKey;
  label: string;
  items: WestBankSourceItem[];
};

type WestBankDigestResponse = {
  generatedAt: string;
  sections: WestBankDigestSection[];
  sourceHealth: WestBankSourceHealth[];
  mapEvents: WestBankSourceItem[];
};

type NormalizedWestBankItem = WestBankSourceItem & {
  publishedAtMs: number;
  priorityScore: number;
  sourceTier: 1 | 2 | 3;
};

type WestBankCluster = {
  key: string;
  placeId?: string;
  placeLabel?: string;
  category: WestBankEventCategory;
  threatLevel: WestBankThreatLevel;
  verification: VerificationClass;
  lat?: number;
  lon?: number;
  sourceCount: number;
  publishedAtMs: number;
  representative: NormalizedWestBankItem;
  items: NormalizedWestBankItem[];
};

type WestBankAiClassification = {
  threatLevel?: WestBankThreatLevel;
  category?: WestBankEventCategory;
};

type AiProviderName = 'ollama' | 'groq' | 'openrouter' | 'generic';

type WestBankDigestWithAiOptions = {
  now?: number;
  lang?: string;
  request?: NodeRequest;
  classifyItem?: (item: NormalizedWestBankItem) => Promise<WestBankAiClassification | null | undefined>;
  summarizeCluster?: (cluster: WestBankCluster, lang: string) => Promise<string | null | undefined>;
};

const WESTBANK_SOURCES: WestBankSourceDefinition[] = [
  {
    id: 'rss-wafa-english',
    name: 'WAFA English',
    type: 'rss',
    tier: 1,
    verification: 'corroborated',
    aliases: ['WAFA'],
  },
  {
    id: 'rss-maan-news',
    name: 'Maan News',
    type: 'rss',
    tier: 1,
    verification: 'corroborated',
    aliases: ['Ma’an News', 'Ma an News'],
  },
  {
    id: 'rss-972-magazine',
    name: '972 Magazine',
    type: 'rss',
    tier: 2,
    verification: 'single-source',
    aliases: ['+972 Magazine', '972'],
  },
  {
    id: 'rss-times-of-israel-wb',
    name: 'Times of Israel WB',
    type: 'rss',
    tier: 2,
    verification: 'single-source',
    aliases: ['Times of Israel West Bank', 'TOI WB'],
  },
  {
    id: 'rss-jerusalem-post-wb',
    name: 'Jerusalem Post WB',
    type: 'rss',
    tier: 2,
    verification: 'single-source',
    aliases: ['Jerusalem Post West Bank', 'JPost WB'],
  },
  {
    id: 'rss-palestine-chronicle',
    name: 'Palestine Chronicle',
    type: 'rss',
    tier: 2,
    verification: 'single-source',
  },
  {
    id: 'telegram-intel',
    name: 'Telegram Intel',
    type: 'telegram',
    tier: 2,
    verification: 'single-source',
    aliases: ['Telegram', 'telegram-intel'],
  },
  {
    id: 'oref-sirens',
    name: 'Israel Sirens',
    type: 'oref',
    tier: 1,
    verification: 'official',
    aliases: ['OREF', 'Oref Sirens', 'Israel Alerts'],
  },
  {
    id: 'acled-westbank',
    name: 'ACLED West Bank',
    type: 'acled',
    tier: 1,
    verification: 'corroborated',
    aliases: ['ACLED'],
  },
  {
    id: 'gdelt-westbank',
    name: 'GDELT West Bank',
    type: 'gdelt',
    tier: 2,
    verification: 'unresolved',
    aliases: ['GDELT', 'Structured Events', 'gdelt-intel'],
  },
];

const WESTBANK_PLACES: WestBankPlaceDefinition[] = [
  {
    id: 'jenin-camp',
    label: 'Jenin Camp',
    lat: 32.4696,
    lon: 35.3005,
    aliases: ['Jenin refugee camp', 'Jenin Camp', 'Jenin RC', 'مخيم جنين'],
  },
  {
    id: 'jenin',
    label: 'Jenin',
    lat: 32.4615,
    lon: 35.2939,
    aliases: ['Jenin Governorate', 'Jenin city', 'Jenin', 'جنين'],
  },
  {
    id: 'balata-camp',
    label: 'Balata Camp',
    lat: 32.2095,
    lon: 35.2848,
    aliases: ['Balata refugee camp', 'Balata Camp', 'مخيم بلاطة'],
  },
  {
    id: 'nablus',
    label: 'Nablus',
    lat: 32.2211,
    lon: 35.2544,
    aliases: ['Nablus Governorate', 'Nablus', 'نابلس', 'Shechem'],
  },
  {
    id: 'nur-shams-camp',
    label: 'Nur Shams Camp',
    lat: 32.3259,
    lon: 35.0651,
    aliases: ['Nur Shams refugee camp', 'Nur Shams Camp', 'Nur Shams', 'نور شمس'],
  },
  {
    id: 'tulkarm-camp',
    label: 'Tulkarm Camp',
    lat: 32.3158,
    lon: 35.0333,
    aliases: ['Tulkarm refugee camp', 'Tulkarm Camp', 'مخيم طولكرم'],
  },
  {
    id: 'tulkarm',
    label: 'Tulkarm',
    lat: 32.3104,
    lon: 35.0286,
    aliases: ['Tulkarm Governorate', 'Tulkarm', 'طولكرم'],
  },
  {
    id: 'qalqilya',
    label: 'Qalqilya',
    lat: 32.1897,
    lon: 34.9706,
    aliases: ['Qalqilya Governorate', 'Qalqilya', 'قلقيلية'],
  },
  {
    id: 'ramallah',
    label: 'Ramallah',
    lat: 31.9038,
    lon: 35.2034,
    aliases: ['Ramallah Governorate', 'Ramallah', 'رام الله', 'Al-Bireh', 'al Bireh'],
  },
  {
    id: 'bethlehem',
    label: 'Bethlehem',
    lat: 31.7054,
    lon: 35.2024,
    aliases: ['Bethlehem Governorate', 'Bethlehem', 'بيت لحم'],
  },
  {
    id: 'hebron',
    label: 'Hebron',
    lat: 31.5326,
    lon: 35.0998,
    aliases: ['Hebron Governorate', 'Hebron', 'الخليل', 'Al-Khalil'],
  },
  {
    id: 'jericho',
    label: 'Jericho',
    lat: 31.8667,
    lon: 35.45,
    aliases: ['Jericho Governorate', 'Jericho', 'أريحا'],
  },
  {
    id: 'tubas',
    label: 'Tubas',
    lat: 32.3209,
    lon: 35.3695,
    aliases: ['Tubas Governorate', 'Tubas', 'طوباس'],
  },
  {
    id: 'salfit',
    label: 'Salfit',
    lat: 32.0833,
    lon: 35.1833,
    aliases: ['Salfit Governorate', 'Salfit', 'سلفيت'],
  },
  {
    id: 'east-jerusalem',
    label: 'East Jerusalem',
    lat: 31.7833,
    lon: 35.2333,
    aliases: ['Occupied East Jerusalem', 'East Jerusalem', 'القدس الشرقية'],
  },
  {
    id: 'shuafat-camp',
    label: 'Shuafat Camp',
    lat: 31.8088,
    lon: 35.2401,
    aliases: ['Shuafat refugee camp', 'Shuafat Camp', 'Shoafat Camp', 'مخيم شعفاط'],
  },
  {
    id: 'masafer-yatta',
    label: 'Masafer Yatta',
    lat: 31.423,
    lon: 35.105,
    aliases: ['Masafer Yatta'],
  },
];

const ITEM_LIMIT_PER_FEED = 5;
const FEED_TIMEOUT_MS = 8_000;
const AI_CLASSIFY_LIMIT = 12;
const AI_SUMMARY_LIMIT = 6;
const AI_SUMMARY_HEADLINE_LIMIT = 5;
const AI_CONCURRENCY = 3;
const RSS_ACCEPT = 'application/rss+xml, application/xml, text/xml, */*';
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
const AI_PROVIDER_CHAIN: AiProviderName[] = ['ollama', 'groq', 'openrouter', 'generic'];

const WESTBANK_FEED_QUERIES = [
  {
    name: 'WAFA English',
    query: 'site:english.wafa.ps ("West Bank" OR Jenin OR Nablus OR Ramallah OR Hebron OR Bethlehem OR Tulkarm OR Tubas OR Qalqilya OR Jericho OR Salfit OR "East Jerusalem") when:7d',
  },
  {
    name: 'Maan News',
    query: 'site:maannews.net ("West Bank" OR Jenin OR Nablus OR Ramallah OR Hebron OR Bethlehem OR Tulkarm OR Tubas OR Qalqilya OR Jericho OR Salfit) when:7d',
  },
  {
    name: '972 Magazine',
    query: 'site:972mag.com ("West Bank" OR settler OR settlement OR Jenin OR Nablus OR Ramallah) when:14d',
  },
  {
    name: 'Times of Israel WB',
    query: 'site:timesofisrael.com ("West Bank" OR settler OR settlement OR Jenin OR Nablus OR Hebron OR Ramallah) when:7d',
  },
  {
    name: 'Jerusalem Post WB',
    query: 'site:jpost.com ("West Bank" OR settler OR settlement OR Jenin OR Nablus OR Hebron OR Ramallah) when:7d',
  },
  {
    name: 'Palestine Chronicle',
    query: 'site:palestinechronicle.com ("West Bank" OR Jenin OR Nablus OR Hebron OR Ramallah OR Bethlehem) when:7d',
  },
] as const;

const THREAT_PRIORITY: Record<WestBankThreatLevel, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const TIER_PRIORITY: Record<1 | 2 | 3, number> = {
  1: 3,
  2: 2,
  3: 1,
};

const VERIFICATION_PRIORITY: Record<VerificationClass, number> = {
  official: 4,
  corroborated: 3,
  'single-source': 2,
  unresolved: 1,
};

const STALE_MINUTES_BY_TYPE: Record<WestBankSourceType, number> = {
  rss: 180,
  telegram: 15,
  oref: 10,
  acled: 360,
  gdelt: 180,
};

const PROTO_LEVEL_TO_WESTBANK: Record<string, WestBankThreatLevel> = {
  THREAT_LEVEL_CRITICAL: 'critical',
  THREAT_LEVEL_HIGH: 'high',
  THREAT_LEVEL_MEDIUM: 'medium',
  THREAT_LEVEL_LOW: 'low',
  THREAT_LEVEL_UNSPECIFIED: 'info',
};

const SECTION_LIMITS: Record<WestBankDigestSectionKey, number> = {
  now: 8,
  last6h: 10,
  mobility: 8,
  settlerViolence: 8,
  officialAlerts: 8,
  lowConfidence: 8,
};

const SECTION_LABELS: Record<WestBankDigestSectionKey, string> = {
  now: 'Now',
  last6h: 'Last 6h',
  mobility: 'Mobility',
  settlerViolence: 'Settler Violence',
  officialAlerts: 'Official Alerts',
  lowConfidence: 'Low Confidence',
};

const CLUSTER_WINDOW_MS = 2 * 60 * 60 * 1000;
const WESTBANK_BOUNDS = {
  minLat: 31.3,
  maxLat: 32.6,
  minLon: 34.8,
  maxLon: 35.55,
};

const MOBILITY_PATTERN = /\b(checkpoint|road closure|closure|closed road|access denied|movement restriction|permit|crossing)\b/i;
const SETTLER_PATTERN = /\b(settlers?|settlement(?:s)?|outpost(?:s)?|pogrom)\b/i;
const RAID_PATTERN = /\b(raid(?:s|ed|ing)?|incursion|storming)\b/i;
const ARREST_PATTERN = /\b(arrest(?:s|ed)?|detain(?:ed|s|ing)?|detention)\b/i;
const DEMOLITION_PATTERN = /\b(demolit(?:ion|ions|ed)|bulldoz(?:e|ed|ing)|home demolition)\b/i;
const OFFICIAL_ALERT_PATTERN = /\b(alert|siren|home front command|oref)\b/i;
const HIGH_THREAT_PATTERN = /\b(raid|incursion|clash|clashes|killed|injured|firefight|attack|attacks|settlers? torch)\b/i;
const MEDIUM_THREAT_PATTERN = /\b(settlers?|checkpoint|arrest|detention|demolition|closure|restrict(?:ed|ion))\b/i;
const LOW_THREAT_PATTERN = /\b(protest|march|road|permit|crossing)\b/i;
const WESTBANK_RELEVANCE_PATTERN = /\b(west bank|occupied west bank|jenin|nablus|tulkarm|qalqilya|ramallah|bethlehem|hebron|al-khalil|jericho|tubas|salfit|east jerusalem|masafer yatta|settlers?|checkpoint)\b/i;

const SOURCE_NAME_INDEX = new Map<string, WestBankSourceDefinition>();
WESTBANK_SOURCES.forEach((source) => {
  for (const name of [source.name, ...(source.aliases ?? [])]) {
    SOURCE_NAME_INDEX.set(normalizeText(name), source);
  }
});

const PLACE_ALIAS_INDEX = WESTBANK_PLACES.flatMap((place) => [place.label, ...place.aliases].map((alias) => ({
  alias: normalizeText(alias),
  place,
}))).sort((left, right) => right.alias.length - left.alias.length);

function normalizeText(value: string): string {
  return value.trim().normalize('NFKC').toLowerCase();
}

function normalizeKey(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getSourceByName(name: string): WestBankSourceDefinition | undefined {
  return SOURCE_NAME_INDEX.get(normalizeText(name));
}

function inferPlaceFromText(text: string): WestBankPlaceDefinition | undefined {
  const normalized = normalizeText(text);
  if (!normalized) return undefined;

  for (const entry of PLACE_ALIAS_INDEX) {
    if (normalized.includes(entry.alias)) return entry.place;
  }

  return undefined;
}

function isFiniteCoordinate(value: number | undefined): value is number {
  return Number.isFinite(value);
}

function isInWestBankBounds(lat: number | undefined, lon: number | undefined): boolean {
  return isFiniteCoordinate(lat)
    && isFiniteCoordinate(lon)
    && lat >= WESTBANK_BOUNDS.minLat
    && lat <= WESTBANK_BOUNDS.maxLat
    && lon >= WESTBANK_BOUNDS.minLon
    && lon <= WESTBANK_BOUNDS.maxLon;
}

function isWestBankRelevantText(text: string): boolean {
  return WESTBANK_RELEVANCE_PATTERN.test(text);
}

function compareThreatLevels(
  left: WestBankThreatLevel | undefined,
  right: WestBankThreatLevel | undefined,
): number {
  return (THREAT_PRIORITY[left ?? 'info'] ?? 0) - (THREAT_PRIORITY[right ?? 'info'] ?? 0);
}

function deriveVerification(items: Pick<NormalizedWestBankItem, 'verification' | 'sourceId'>[]): VerificationClass {
  if (items.some((item) => item.verification === 'official')) return 'official';
  if (new Set(items.map((item) => item.sourceId)).size >= 2) return 'corroborated';
  return items[0]?.verification ?? 'unresolved';
}

function scoreWestBankItemPriority(item: Pick<NormalizedWestBankItem, 'threatLevel' | 'sourceTier' | 'verification' | 'publishedAtMs'>): number {
  const threatScore = THREAT_PRIORITY[item.threatLevel ?? 'info'] * 100;
  const tierScore = TIER_PRIORITY[item.sourceTier] * 20;
  const verificationScore = VERIFICATION_PRIORITY[item.verification] * 15;
  const ageMinutes = Math.max(0, (Date.now() - item.publishedAtMs) / 60_000);
  const recencyScore = Math.max(0, 60 - ageMinutes);
  return Math.round(threatScore + tierScore + verificationScore + recencyScore);
}

function compareWestBankItems(left: NormalizedWestBankItem, right: NormalizedWestBankItem): number {
  return (
    right.priorityScore - left.priorityScore
    || compareThreatLevels(right.threatLevel, left.threatLevel)
    || right.publishedAtMs - left.publishedAtMs
    || (right.sourceCount ?? 1) - (left.sourceCount ?? 1)
  );
}

function compareWestBankClusters(left: WestBankCluster, right: WestBankCluster): number {
  return (
    compareThreatLevels(right.threatLevel, left.threatLevel)
    || VERIFICATION_PRIORITY[right.verification] - VERIFICATION_PRIORITY[left.verification]
    || right.sourceCount - left.sourceCount
    || right.publishedAtMs - left.publishedAtMs
    || right.representative.priorityScore - left.representative.priorityScore
  );
}

function toThreatLevel(level: string | undefined, title: string): WestBankThreatLevel {
  if (level && PROTO_LEVEL_TO_WESTBANK[level]) return PROTO_LEVEL_TO_WESTBANK[level];
  if (HIGH_THREAT_PATTERN.test(title)) return 'high';
  if (MEDIUM_THREAT_PATTERN.test(title)) return 'medium';
  if (LOW_THREAT_PATTERN.test(title)) return 'low';
  return 'info';
}

function normalizeEventCategory(
  title: string,
  rawCategory: string | undefined,
  sourceType: WestBankSourceType,
): WestBankEventCategory {
  const lower = title.toLowerCase();
  if (sourceType === 'oref' || OFFICIAL_ALERT_PATTERN.test(lower)) return 'official-alert';
  if (SETTLER_PATTERN.test(lower)) return 'settler-violence';
  if (MOBILITY_PATTERN.test(lower)) return 'mobility';
  if (RAID_PATTERN.test(lower)) return 'raid';
  if (ARREST_PATTERN.test(lower)) return 'arrest';
  if (DEMOLITION_PATTERN.test(lower)) return 'demolition';

  switch (rawCategory) {
    case 'protest':
      return 'protest';
    case 'conflict':
    case 'military':
    case 'terrorism':
      return 'conflict';
    default:
      return 'general';
  }
}

function createEmptyWestBankDigestResponse(generatedAt = new Date().toISOString()): WestBankDigestResponse {
  return {
    generatedAt,
    sections: Object.keys(SECTION_LABELS).map((key) => ({
      key: key as WestBankDigestSectionKey,
      label: SECTION_LABELS[key as WestBankDigestSectionKey],
      items: [],
    })),
    sourceHealth: [],
    mapEvents: [],
  };
}

function normalizeWestBankSeedDigest(seedDigest: SeedDigest): NormalizedWestBankItem[] {
  const items = Object.values(seedDigest.categories ?? {}).flatMap((bucket) => bucket.items ?? []);
  const normalized: NormalizedWestBankItem[] = [];

  for (const item of items) {
    const source = getSourceByName(item.source);
    const publishedAtMs: number =
      typeof item.publishedAt === 'number' && Number.isFinite(item.publishedAt)
        ? item.publishedAt
        : Date.now();
    const text = `${item.title ?? ''} ${item.locationName ?? ''}`.trim();
    const inferredPlace = inferPlaceFromText(text);
    const lat = inferredPlace?.lat ?? item.location?.latitude;
    const lon = inferredPlace?.lon ?? item.location?.longitude;

    if (!inferredPlace && !isWestBankRelevantText(text) && !isInWestBankBounds(lat, lon)) {
      continue;
    }

    const normalizedItem: NormalizedWestBankItem = {
      id: item.link || `${item.source}:${publishedAtMs}:${item.title}`,
      sourceId: source?.id ?? `unknown:${normalizeKey(item.source)}`,
      sourceName: source?.name ?? item.source,
      sourceType: source?.type ?? 'rss',
      verification: source?.verification ?? 'unresolved',
      sourceTier: source?.tier ?? 3,
      sourceCount: Math.max(1, item.corroborationCount || 1),
      title: item.title,
      link: item.link,
      publishedAt: new Date(publishedAtMs).toISOString(),
      publishedAtMs,
      threatLevel: toThreatLevel(item.threat?.level, item.title),
      category: normalizeEventCategory(item.title, item.threat?.category, source?.type ?? 'rss'),
      placeId: inferredPlace?.id,
      placeLabel: inferredPlace?.label ?? item.locationName ?? undefined,
      lat,
      lon,
      excerpt: undefined,
      rawSourceName: item.source,
      priorityScore: 0,
    };

    normalizedItem.priorityScore = scoreWestBankItemPriority(normalizedItem);
    normalized.push(normalizedItem);
  }

  return normalized.sort(compareWestBankItems);
}

function getClusterKey(item: NormalizedWestBankItem): string {
  const bucket = Math.floor(item.publishedAtMs / CLUSTER_WINDOW_MS);
  const base =
    item.placeId
    || normalizeKey(item.placeLabel ?? '')
    || normalizeKey(item.title)
    || item.id;

  return `${base}:${item.category ?? 'general'}:${bucket}`;
}

function toRepresentativeItem(cluster: WestBankCluster): WestBankSourceItem {
  return {
    ...cluster.representative,
    sourceCount: cluster.sourceCount,
    verification: cluster.verification,
    threatLevel: cluster.threatLevel,
    category: cluster.category,
    placeId: cluster.placeId,
    placeLabel: cluster.placeLabel,
    lat: cluster.lat,
    lon: cluster.lon,
  };
}

function clusterWestBankItems(items: NormalizedWestBankItem[]): WestBankCluster[] {
  const clusters = new Map<string, NormalizedWestBankItem[]>();

  for (const item of items) {
    const key = getClusterKey(item);
    const existing = clusters.get(key) ?? [];
    existing.push(item);
    clusters.set(key, existing);
  }

  return [...clusters.entries()].map(([key, clusterItems]) => {
    const uniqueByLink = new Map<string, NormalizedWestBankItem>();

    for (const item of clusterItems) {
      const dedupeKey = item.link || item.id;
      const existing = uniqueByLink.get(dedupeKey);
      if (!existing || compareWestBankItems(item, existing) < 0) {
        uniqueByLink.set(dedupeKey, item);
      }
    }

    const dedupedItems = [...uniqueByLink.values()].sort(compareWestBankItems);
    const representative = dedupedItems[0]!;
    const verification = deriveVerification(dedupedItems);
    const threatLevel = dedupedItems.reduce(
      (current, item) => (item.priorityScore > current.priorityScore ? item : current),
      representative,
    ).threatLevel ?? representative.threatLevel ?? 'info';

    return {
      key,
      placeId: representative.placeId,
      placeLabel: representative.placeLabel,
      category: representative.category ?? 'general',
      threatLevel,
      verification,
      lat: representative.lat,
      lon: representative.lon,
      sourceCount: new Set(dedupedItems.map((item) => item.sourceId)).size,
      publishedAtMs: Math.max(...dedupedItems.map((item) => item.publishedAtMs)),
      representative,
      items: dedupedItems,
    };
  }).sort(compareWestBankClusters);
}

function createSection(
  key: WestBankDigestSectionKey,
  clusters: WestBankCluster[],
  predicate: (cluster: WestBankCluster) => boolean,
): WestBankDigestSection {
  return {
    key,
    label: SECTION_LABELS[key],
    items: clusters
      .filter(predicate)
      .sort(compareWestBankClusters)
      .slice(0, SECTION_LIMITS[key])
      .map(toRepresentativeItem),
  };
}

function buildWestBankSections(clusters: WestBankCluster[], now: number): WestBankDigestSection[] {
  return [
    createSection('now', clusters, (cluster) => now - cluster.publishedAtMs <= 2 * 60 * 60 * 1000),
    createSection('last6h', clusters, (cluster) => now - cluster.publishedAtMs <= 6 * 60 * 60 * 1000),
    createSection('mobility', clusters, (cluster) => cluster.category === 'mobility'),
    createSection('settlerViolence', clusters, (cluster) => cluster.category === 'settler-violence'),
    createSection('officialAlerts', clusters, (cluster) => cluster.category === 'official-alert' || cluster.verification === 'official'),
    createSection('lowConfidence', clusters, (cluster) => cluster.verification === 'unresolved' || cluster.verification === 'single-source'),
  ];
}

function buildWestBankMapEvents(clusters: WestBankCluster[], limit = 20): WestBankSourceItem[] {
  return clusters
    .filter((cluster) => cluster.lat != null && cluster.lon != null)
    .sort(compareWestBankClusters)
    .slice(0, limit)
    .map(toRepresentativeItem);
}

function classifySourceHealthCode(rawStatus: string | undefined): WestBankSourceHealthCode | null {
  if (!rawStatus) return null;
  const normalized = rawStatus.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'empty' || normalized.includes('empty')) return 'empty_window';
  if (normalized === 'timeout' || normalized.includes('timed out') || normalized.includes('timeout') || normalized.includes('abort')) {
    return 'upstream_timeout';
  }
  if (
    normalized.includes('relay unavailable')
    || (normalized.includes('relay') && normalized.includes('unavailable'))
    || normalized.includes('no relay')
  ) {
    return 'relay_unavailable';
  }
  if (
    normalized.includes('proxy missing')
    || normalized.includes('proxy unavailable')
    || (normalized.includes('proxy') && normalized.includes('not set'))
  ) {
    return 'proxy_missing';
  }
  if (normalized.includes('stale')) return 'stale_cache';
  return 'digest_unavailable';
}

function describeSourceHealth(code: WestBankSourceHealthCode, staleMinutes?: number): string | undefined {
  switch (code) {
    case 'healthy':
      return undefined;
    case 'pending_integration':
      return 'Optional feed is not wired into the West Bank digest yet.';
    case 'empty_window':
      return 'No recent West Bank items in the current digest window.';
    case 'no_mapped_items':
      return 'Feed responded, but no West Bank incidents were mapped into the digest window.';
    case 'stale_cache':
      return staleMinutes != null
        ? `Latest mapped item is ${staleMinutes}m old. Coverage may be stale.`
        : 'Coverage may be stale.';
    case 'upstream_timeout':
      return 'Feed timed out during the last digest run.';
    case 'relay_unavailable':
      return 'Relay path was unavailable during the last digest run.';
    case 'proxy_missing':
      return 'Proxy or relay configuration is missing for this source.';
    case 'digest_unavailable':
      return 'Digest builder failed before source health could be refreshed.';
    default:
      return undefined;
  }
}

function buildHealthEntry(
  source: WestBankSourceDefinition,
  health: Omit<WestBankSourceHealth, 'sourceId' | 'sourceName'>,
): WestBankSourceHealth {
  return {
    sourceId: source.id,
    sourceName: source.name,
    ...health,
  };
}

function buildPendingIntegrationHealth(source: WestBankSourceDefinition): WestBankSourceHealth {
  return buildHealthEntry(source, {
    status: 'degraded',
    code: 'pending_integration',
    message: describeSourceHealth('pending_integration'),
  });
}

function buildFeedHealth(
  source: WestBankSourceDefinition,
  feedStatus: string | undefined,
  latestSeen: number | undefined,
  now: number,
): WestBankSourceHealth {
  const statusCode = classifySourceHealthCode(feedStatus);
  if (statusCode === 'upstream_timeout' || statusCode === 'relay_unavailable' || statusCode === 'proxy_missing') {
    return buildHealthEntry(source, {
      status: 'down',
      code: statusCode,
      message: describeSourceHealth(statusCode),
    });
  }

  if (statusCode === 'empty_window') {
    return buildHealthEntry(source, {
      status: 'degraded',
      code: statusCode,
      message: describeSourceHealth(statusCode),
    });
  }

  if (!latestSeen) {
    return buildHealthEntry(source, {
      status: 'degraded',
      code: 'no_mapped_items',
      message: describeSourceHealth('no_mapped_items'),
    });
  }

  const staleMinutes = Math.max(0, Math.round((now - latestSeen) / 60_000));
  if (staleMinutes > STALE_MINUTES_BY_TYPE[source.type]) {
    return buildHealthEntry(source, {
      status: 'degraded',
      code: 'stale_cache',
      staleMinutes,
      message: describeSourceHealth('stale_cache', staleMinutes),
    });
  }

  return buildHealthEntry(source, {
    status: 'ok',
    code: 'healthy',
    staleMinutes,
  });
}

function classifyWestBankDigestFailure(error: unknown): {
  code: WestBankSourceHealthCode;
  message: string;
} {
  const message = error instanceof Error && error.message.trim()
    ? error.message.trim()
    : 'Digest builder failed before source health could be refreshed.';
  const code = classifySourceHealthCode(message) ?? 'digest_unavailable';
  return { code, message };
}

function buildWestBankFailureSourceHealth(error: unknown): WestBankSourceHealth[] {
  const failure = classifyWestBankDigestFailure(error);

  return WESTBANK_SOURCES.map((source) => buildHealthEntry(source, {
    status: source.type === 'rss' ? 'down' : 'degraded',
    code: failure.code,
    message: failure.message,
  }));
}

function buildWestBankSourceHealth(
  seedDigest: SeedDigest,
  items: Pick<WestBankSourceItem, 'sourceId' | 'publishedAt'>[],
  now: number,
): WestBankSourceHealth[] {
  const latestBySource = new Map<string, number>();

  for (const item of items) {
    const publishedAtMs = new Date(item.publishedAt).getTime();
    if (!Number.isFinite(publishedAtMs)) continue;
    latestBySource.set(item.sourceId, Math.max(latestBySource.get(item.sourceId) ?? 0, publishedAtMs));
  }

  return WESTBANK_SOURCES.map((source) => {
    if (source.type !== 'rss') {
      return buildPendingIntegrationHealth(source);
    }

    const latestSeen = latestBySource.get(source.id);
    return buildFeedHealth(source, seedDigest.feedStatuses?.[source.name], latestSeen, now);
  });
}

export function buildWestBankDigestFromSeed(
  seedDigest: SeedDigest,
  now = Date.now(),
): WestBankDigestResponse {
  const normalizedItems = normalizeWestBankSeedDigest(seedDigest);
  const clusters = clusterWestBankItems(normalizedItems);
  const response = createEmptyWestBankDigestResponse(
    seedDigest.generatedAt || new Date(now).toISOString(),
  );

  response.sections = buildWestBankSections(clusters, now);
  response.sourceHealth = buildWestBankSourceHealth(seedDigest, normalizedItems, now);
  response.mapEvents = buildWestBankMapEvents(clusters);

  return response;
}

function toRequestHeaders(headers: NodeRequest['headers']): Headers {
  const normalized = new Headers();

  for (const [name, rawValue] of Object.entries(headers)) {
    if (Array.isArray(rawValue)) {
      const first = rawValue.find((value) => typeof value === 'string' && value.trim());
      if (first) normalized.set(name, first);
      continue;
    }

    if (typeof rawValue === 'string' && rawValue.trim()) {
      normalized.set(name, rawValue);
    }
  }

  return normalized;
}

function createServerContext(req: NodeRequest): IntelligenceServerContext & NewsServerContext {
  const request = new Request(
    new URL(req.url ?? '/api/westbank-digest', getRequestOrigin(req)).toString(),
    {
      method: req.method ?? 'GET',
      headers: toRequestHeaders(req.headers),
    },
  );

  return {
    request,
    pathParams: {},
    headers: Object.fromEntries(request.headers.entries()),
  };
}

function normalizeAiThreatLevel(level: string | undefined): WestBankThreatLevel | undefined {
  switch (level?.trim().toLowerCase()) {
    case 'critical':
    case 'high':
    case 'medium':
    case 'low':
    case 'info':
      return level.trim().toLowerCase() as WestBankThreatLevel;
    default:
      return undefined;
  }
}

function applyAiClassification(
  item: NormalizedWestBankItem,
  classification: WestBankAiClassification | null | undefined,
): void {
  if (!classification) return;

  if (classification.threatLevel) item.threatLevel = classification.threatLevel;
  if (classification.category) item.category = classification.category;
  item.priorityScore = scoreWestBankItemPriority(item);
}

async function resolveAvailableAiProvider(): Promise<AiProviderName | null> {
  const [{ getProviderCredentials }, { isProviderAvailable }] = await Promise.all([
    import('../server/_shared/llm'),
    import('../server/_shared/llm-health'),
  ]);

  for (const provider of AI_PROVIDER_CHAIN) {
    const credentials = getProviderCredentials(provider);
    if (!credentials) continue;
    if (await isProviderAvailable(credentials.apiUrl)) return provider;
  }

  return null;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) return;
        await task(item);
      }
    },
  );

  await Promise.all(workers);
}

async function classifyWestBankItemWithAi(
  ctx: IntelligenceServerContext,
  item: NormalizedWestBankItem,
): Promise<WestBankAiClassification | null> {
  const { classifyEvent: classifyEventRpc } = await import('../server/worldmonitor/intelligence/v1/classify-event');
  const response = await classifyEventRpc(ctx, {
    title: item.title,
    description: item.placeLabel ?? '',
    source: item.sourceName,
    country: 'PS',
  });

  return toWestBankAiClassification(item, response);
}

function toWestBankAiClassification(
  item: Pick<NormalizedWestBankItem, 'title' | 'sourceType'>,
  response: ClassifyEventResponse,
): WestBankAiClassification | null {
  const classification = response.classification;
  if (!classification) return null;

  const threatLevel = normalizeAiThreatLevel(classification.subcategory);
  const category = normalizeEventCategory(
    item.title,
    classification.category,
    item.sourceType,
  );

  return { threatLevel, category };
}

async function enrichWestBankItemsWithAi(
  items: NormalizedWestBankItem[],
  options: WestBankDigestWithAiOptions,
): Promise<NormalizedWestBankItem[]> {
  const classifyItem = options.classifyItem;
  if (!classifyItem) return items.sort(compareWestBankItems);

  const candidates = items
    .slice()
    .sort(compareWestBankItems)
    .slice(0, AI_CLASSIFY_LIMIT);

  await runWithConcurrency(candidates, AI_CONCURRENCY, async (item) => {
    try {
      applyAiClassification(item, await classifyItem(item));
    } catch {
      item.priorityScore = scoreWestBankItemPriority(item);
    }
  });

  return items.sort(compareWestBankItems);
}

async function summarizeWestBankClusterWithAi(
  ctx: NewsServerContext,
  cluster: WestBankCluster,
  provider: AiProviderName,
  lang: string,
): Promise<string | undefined> {
  const { summarizeArticle: summarizeArticleRpc } = await import('../server/worldmonitor/news/v1/summarize-article');
  const headlines = [...new Set(cluster.items.map((item) => item.title.trim()).filter(Boolean))]
    .slice(0, AI_SUMMARY_HEADLINE_LIMIT);

  if (headlines.length === 0) return undefined;

  const response = await summarizeArticleRpc(ctx, {
    provider,
    headlines,
    mode: 'brief',
    geoContext: cluster.placeLabel ?? '',
    variant: 'westbank',
    lang,
    systemAppend: '',
  });

  return normalizeSummaryResponse(response);
}

function normalizeSummaryResponse(response: SummarizeArticleResponse): string | undefined {
  const summary = typeof response.summary === 'string' ? response.summary.trim() : '';
  if (!summary || response.fallback) return undefined;
  return summary;
}

async function enrichWestBankClustersWithAi(
  clusters: WestBankCluster[],
  options: WestBankDigestWithAiOptions,
): Promise<void> {
  const summarizeCluster = options.summarizeCluster;
  if (!summarizeCluster) return;

  const candidates = clusters
    .slice()
    .sort(compareWestBankClusters)
    .slice(0, AI_SUMMARY_LIMIT);

  await runWithConcurrency(candidates, AI_CONCURRENCY, async (cluster) => {
    try {
      const summary = await summarizeCluster(cluster, options.lang ?? 'en');
      if (summary?.trim()) cluster.representative.excerpt = summary.trim();
    } catch {
      // Keep the digest usable even when AI summarization is unavailable.
    }
  });
}

function createAiEnrichmentOptions(
  request: NodeRequest | undefined,
  lang: string | undefined,
  availableProvider: AiProviderName | null,
): Pick<WestBankDigestWithAiOptions, 'classifyItem' | 'summarizeCluster'> {
  if (!request || !availableProvider) {
    return {};
  }

  const ctx = createServerContext(request);

  return {
    classifyItem: (item) => classifyWestBankItemWithAi(ctx, item),
    summarizeCluster: (cluster, clusterLang) =>
      summarizeWestBankClusterWithAi(ctx, cluster, availableProvider, clusterLang || lang || 'en'),
  };
}

export async function buildWestBankDigestFromSeedWithAi(
  seedDigest: SeedDigest,
  options: WestBankDigestWithAiOptions = {},
): Promise<WestBankDigestResponse> {
  const now = options.now ?? Date.now();
  const normalizedItems = await enrichWestBankItemsWithAi(
    normalizeWestBankSeedDigest(seedDigest),
    options,
  );
  const clusters = clusterWestBankItems(normalizedItems);
  await enrichWestBankClustersWithAi(clusters, options);

  const response = createEmptyWestBankDigestResponse(
    seedDigest.generatedAt || new Date(now).toISOString(),
  );

  response.sections = buildWestBankSections(clusters, now);
  response.sourceHealth = buildWestBankSourceHealth(seedDigest, normalizedItems, now);
  response.mapEvents = buildWestBankMapEvents(clusters);

  return response;
}

export function createWestBankDigestFailureResponse(error: unknown): WestBankDigestResponse {
  const response = createEmptyWestBankDigestResponse();
  response.sourceHealth = buildWestBankFailureSourceHealth(error);
  return response;
}

function getHeader(headers: NodeRequest['headers'], name: string): string {
  const value = headers[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function getRequestOrigin(req: NodeRequest): string {
  const proto = getHeader(req.headers, 'x-forwarded-proto') || 'https';
  const host = getHeader(req.headers, 'x-forwarded-host')
    || getHeader(req.headers, 'host')
    || 'world-monitor-west-bank.vercel.app';
  return `${proto}://${host}`;
}

function setCorsHeaders(res: NodeResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-WorldMonitor-Key, X-Api-Key, X-Widget-Key, X-Pro-Key',
  );
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
}

function getOperatorApiKey(): string {
  const directKey = process.env.WORLDMONITOR_API_KEY?.trim();
  if (directKey) return directKey;

  const validKey = (process.env.WORLDMONITOR_VALID_KEYS ?? '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);

  return validKey ?? '';
}

function getGoogleNewsLocale(lang: string): {
  hl: string;
  gl: string;
  ceid: string;
} {
  if (lang.toLowerCase().startsWith('ar')) {
    return { hl: 'ar', gl: 'PS', ceid: 'PS:ar' };
  }

  return { hl: 'en-US', gl: 'US', ceid: 'US:en' };
}

function buildGoogleNewsRssUrl(query: string, lang: string): string {
  const locale = getGoogleNewsLocale(lang);
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(locale.hl)}&gl=${encodeURIComponent(locale.gl)}&ceid=${encodeURIComponent(locale.ceid)}`;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1] ? decodeXmlEntities(match[1]) : '';
}

async function fetchRssText(url: string, lang: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: RSS_ACCEPT,
        'Accept-Language': getGoogleNewsLocale(lang).hl,
        'User-Agent': CHROME_UA,
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`RSS HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseRssItems(sourceName: string, xml: string): SeedDigestItem[] {
  const itemMatches = [...xml.matchAll(/<item[\s\S]*?>([\s\S]*?)<\/item>/gi)];
  const entryMatches = itemMatches.length > 0
    ? []
    : [...xml.matchAll(/<entry[\s\S]*?>([\s\S]*?)<\/entry>/gi)];
  const matches = itemMatches.length > 0 ? itemMatches : entryMatches;
  const items: SeedDigestItem[] = [];

  for (const match of matches.slice(0, ITEM_LIMIT_PER_FEED)) {
    const block = match[1] ?? '';
    const title = extractTag(block, 'title');
    if (!title) continue;

    let link = extractTag(block, 'link');
    if (!link) {
      const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
      link = hrefMatch?.[1] ?? '';
    }
    if (!/^https?:\/\//i.test(link)) continue;

    const pubDateRaw = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const publishedAt = Date.parse(pubDateRaw || '');

    items.push({
      source: sourceName,
      title,
      link,
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : Date.now(),
    });
  }

  return items;
}

async function fetchWestBankSeedDigestFromRss(lang: string): Promise<SeedDigest> {
  const feedStatuses: Record<string, string> = {};
  const feedItems = await Promise.all(WESTBANK_FEED_QUERIES.map(async (feed) => {
    try {
      const xml = await fetchRssText(buildGoogleNewsRssUrl(feed.query, lang), lang);
      const items = parseRssItems(feed.name, xml);
      feedStatuses[feed.name] = items.length > 0 ? 'ok' : 'empty';
      return items;
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'digest_unavailable';
      feedStatuses[feed.name] = message;
      return [];
    }
  }));

  return {
    generatedAt: new Date().toISOString(),
    feedStatuses,
    categories: {
      westbank: {
        items: feedItems.flat(),
      },
    },
  };
}

async function fetchWestBankSeedDigestFromGateway(req: NodeRequest, lang: string): Promise<SeedDigest> {
  const origin = getRequestOrigin(req);
  const url = new URL('/api/news/v1/list-feed-digest', origin);
  url.searchParams.set('variant', 'westbank');
  url.searchParams.set('lang', lang);
  const operatorKey = getOperatorApiKey();

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      Origin: origin,
      Referer: `${origin}/`,
      ...(operatorKey ? { 'X-WorldMonitor-Key': operatorKey } : {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Seed digest HTTP ${response.status}`);
  }

  return await response.json() as SeedDigest;
}

async function fetchWestBankSeedDigest(req: NodeRequest, lang: string): Promise<SeedDigest> {
  try {
    return await fetchWestBankSeedDigestFromGateway(req, lang);
  } catch {
    return fetchWestBankSeedDigestFromRss(lang);
  }
}

export default async function handler(req: NodeRequest, res: NodeResponse): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).send(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const url = new URL(req.url ?? '/api/westbank-digest', getRequestOrigin(req));
    const lang = url.searchParams.get('lang') ?? 'en';
    const seedDigest = await fetchWestBankSeedDigest(req, lang);
    const availableProvider = await resolveAvailableAiProvider();
    const payload = await buildWestBankDigestFromSeedWithAi(seedDigest, {
      lang,
      request: req,
      ...createAiEnrichmentOptions(req, lang, availableProvider),
    });
    res.status(200).send(JSON.stringify(payload));
  } catch (error) {
    const payload = createWestBankDigestFailureResponse(error);
    res.status(200).send(JSON.stringify(payload));
  }
}
