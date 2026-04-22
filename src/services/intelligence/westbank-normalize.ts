import type { ListFeedDigestResponse } from '../../generated/server/worldmonitor/news/v1/service_server.ts';
import { findWestBankPlacesInText } from '../../config/westbank-places.ts';
import { isWestBankRelevant } from '../../config/westbank-focus.ts';
import { getWestBankSourceByName } from '../../config/westbank-sources.ts';
import type {
  WestBankEventCategory,
  WestBankSourceTier,
  WestBankThreatLevel,
} from '../../types/westbank.ts';
import type { NormalizedWestBankItem } from './westbank-score.ts';
import { scoreWestBankItemPriority } from './westbank-score.ts';

const PROTO_LEVEL_TO_WESTBANK: Record<string, WestBankThreatLevel> = {
  THREAT_LEVEL_CRITICAL: 'critical',
  THREAT_LEVEL_HIGH: 'high',
  THREAT_LEVEL_MEDIUM: 'medium',
  THREAT_LEVEL_LOW: 'low',
  THREAT_LEVEL_UNSPECIFIED: 'info',
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

function toThreatLevel(level: string | undefined, fallbackTitle: string): WestBankThreatLevel {
  if (level && PROTO_LEVEL_TO_WESTBANK[level]) return PROTO_LEVEL_TO_WESTBANK[level];
  if (HIGH_THREAT_PATTERN.test(fallbackTitle)) return 'high';
  if (MEDIUM_THREAT_PATTERN.test(fallbackTitle)) return 'medium';
  if (LOW_THREAT_PATTERN.test(fallbackTitle)) return 'low';
  return 'info';
}

function normalizeEventCategory(title: string, rawCategory: string | undefined, sourceType: string): WestBankEventCategory {
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

function toSourceTier(tier: number | undefined): WestBankSourceTier {
  if (tier === 1 || tier === 2 || tier === 3) return tier;
  return 3;
}

export function normalizeWestBankSeedDigest(seedDigest: ListFeedDigestResponse): NormalizedWestBankItem[] {
  const items = Object.values(seedDigest.categories ?? {})
    .flatMap((bucket) => bucket.items ?? []);

  const normalized: NormalizedWestBankItem[] = [];

  for (const item of items) {
    const source = getWestBankSourceByName(item.source);
    const publishedAtMs = Number.isFinite(item.publishedAt) ? item.publishedAt : Date.now();
    const candidate = {
      title: item.title,
      source: item.source,
      locationName: item.locationName,
      importanceScore: item.importanceScore,
      link: item.link,
      pubDate: new Date(publishedAtMs),
    };

    const places = findWestBankPlacesInText(`${item.title ?? ''} ${item.locationName ?? ''}`.trim());
    if (places.length === 0 && !isWestBankRelevant(candidate)) continue;

    const primaryPlace = places[0];
    const sourceTier = toSourceTier(source?.tier);
    const threatLevel = toThreatLevel(item.threat?.level, item.title);
    const verification = source?.verification ?? 'unresolved';
    const normalizedItem: NormalizedWestBankItem = {
      id: item.link || `${item.source}:${publishedAtMs}:${item.title}`,
      sourceId: source?.id ?? `unknown:${item.source.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      sourceName: source?.name ?? item.source,
      sourceType: source?.type ?? 'rss',
      sourceTier,
      verification,
      title: item.title,
      link: item.link,
      publishedAt: new Date(publishedAtMs).toISOString(),
      publishedAtMs,
      threatLevel,
      category: normalizeEventCategory(item.title, item.threat?.category, source?.type ?? 'rss'),
      placeId: primaryPlace?.id,
      placeLabel: primaryPlace?.label ?? item.locationName ?? undefined,
      lat: primaryPlace?.lat ?? item.location?.latitude,
      lon: primaryPlace?.lon ?? item.location?.longitude,
      sourceCount: Math.max(1, item.corroborationCount || 1),
      priorityScore: 0,
      excerpt: undefined,
      rawSourceName: item.source,
    };

    normalizedItem.priorityScore = scoreWestBankItemPriority(normalizedItem);
    normalized.push(normalizedItem);
  }

  return normalized.sort((left, right) =>
    right.priorityScore - left.priorityScore ||
    right.publishedAtMs - left.publishedAtMs
  );
}
