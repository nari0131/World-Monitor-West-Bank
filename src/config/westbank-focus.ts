import type { ClusteredEvent, NewsItem, ThreatLevel } from '@/types';

type FocusCandidate = Pick<NewsItem, 'title' | 'source' | 'locationName' | 'importanceScore' | 'link' | 'pubDate'>;
type ThreatClusterCandidate = Pick<ClusteredEvent, 'primaryTitle' | 'primarySource' | 'primaryLink' | 'sourceCount' | 'lastUpdated' | 'threat' | 'lat' | 'lon' | 'allItems'>;

export const WESTBANK_DEFAULT_VIEW = {
  lat: 31.95,
  lon: 35.2,
  zoom: 7,
} as const;

export const WESTBANK_WATCHLIST = [
  'Jenin',
  'Nablus',
  'Ramallah',
  'Hebron',
  'Tulkarm',
  'Tubas',
  'Qalqilya',
  'Bethlehem',
  'Jericho',
  'Salfit',
  'East Jerusalem',
] as const;

export const WESTBANK_LOCAL_SOURCES = new Set([
  'WAFA English',
  'Maan News',
  '972 Magazine',
  'Jerusalem Post WB',
  'Times of Israel WB',
  'Palestine Chronicle',
]);

const PLACE_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Jenin', pattern: /\bjenin\b/i },
  { label: 'Nablus', pattern: /\bnablus\b/i },
  { label: 'Ramallah', pattern: /\bramallah\b/i },
  { label: 'Hebron', pattern: /\bhebron\b/i },
  { label: 'Tulkarm', pattern: /\btulkarm\b/i },
  { label: 'Tubas', pattern: /\btubas\b/i },
  { label: 'Qalqilya', pattern: /\bqalqilya\b/i },
  { label: 'Bethlehem', pattern: /\bbethlehem\b/i },
  { label: 'Jericho', pattern: /\bjericho\b/i },
  { label: 'Salfit', pattern: /\bsalfit\b/i },
  { label: 'East Jerusalem', pattern: /\beast jerusalem\b/i },
  { label: 'Masafer Yatta', pattern: /\bmasafer yatta\b/i },
];

const HIGH_PRIORITY_PATTERNS = [
  /\bwest bank\b/i,
  /\boccupied west bank\b/i,
  /\bsettlers?\b/i,
  /\bsettlements?\b/i,
  /\bcheckpoint\b/i,
  /\brefugee camp\b/i,
  /\bidf raid\b/i,
  /\braid(s|ed|ing)?\b/i,
  /\barrests?\b/i,
];

const SUPPORTING_PATTERNS = [
  /\bpalestinian authority\b/i,
  /\bpa security\b/i,
  /\boutpost\b/i,
  /\broad closure\b/i,
  /\bclashes?\b/i,
  /\bincursion\b/i,
  /\bannexation\b/i,
  /\bhouse demolition\b/i,
  /\bland seizure\b/i,
];

const DOWNRANK_PATTERNS = [
  /\bgaza\b/i,
  /\blebanon\b/i,
  /\bsyria\b/i,
  /\btehran\b/i,
  /\bhouthis?\b/i,
];

const THREAT_PRIORITY: Record<ThreatLevel, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function textFor(item: Pick<FocusCandidate, 'title' | 'locationName'>): string {
  return `${item.title ?? ''} ${item.locationName ?? ''}`.trim().toLowerCase();
}

function extractPlacesFromText(text: string): string[] {
  return PLACE_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

function countPatternMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

export function extractWestBankPlaces(item: Pick<FocusCandidate, 'title' | 'locationName'>): string[] {
  return extractPlacesFromText(textFor(item));
}

export function extractWestBankPlacesFromCluster(cluster: Pick<ThreatClusterCandidate, 'primaryTitle' | 'allItems'>): string[] {
  const places = new Set<string>(extractPlacesFromText((cluster.primaryTitle ?? '').toLowerCase()));
  cluster.allItems.forEach((item) => {
    extractWestBankPlaces(item).forEach((place) => places.add(place));
  });
  return [...places];
}

export function scoreWestBankRelevance(item: FocusCandidate): number {
  const title = (item.title ?? '').toLowerCase();
  const fullText = textFor(item);
  const placesInTitle = extractWestBankPlaces({ title: item.title, locationName: '' }).length;
  const placesOverall = extractWestBankPlaces(item).length;

  let score = 0;

  if (WESTBANK_LOCAL_SOURCES.has(item.source)) score += 2;
  if (/\bwest bank\b/i.test(fullText)) score += 5;

  score += placesInTitle * 3;
  score += Math.max(0, placesOverall - placesInTitle) * 2;
  score += countPatternMatches(title, HIGH_PRIORITY_PATTERNS) * 2;
  score += countPatternMatches(fullText, SUPPORTING_PATTERNS);
  score -= countPatternMatches(title, DOWNRANK_PATTERNS);

  return score;
}

export function isWestBankRelevant(item: FocusCandidate, minScore = 3): boolean {
  return scoreWestBankRelevance(item) >= minScore;
}

export function scoreWestBankClusterRelevance(cluster: ThreatClusterCandidate): number {
  const primaryScore = scoreWestBankRelevance({
    title: cluster.primaryTitle,
    source: cluster.primarySource,
    locationName: '',
    importanceScore: 0,
    link: cluster.primaryLink,
    pubDate: cluster.lastUpdated,
  });
  const itemScore = cluster.allItems.reduce((max, item) => Math.max(max, scoreWestBankRelevance(item)), 0);
  const baseScore = Math.max(primaryScore, itemScore);
  if (baseScore <= 0) return 0;
  const severityBoost = cluster.threat ? THREAT_PRIORITY[cluster.threat.level] ?? 0 : 0;
  const corroborationBoost = Math.max(0, Math.min(cluster.sourceCount, 4) - 1);
  return baseScore + severityBoost + corroborationBoost;
}

export function isWestBankThreatCluster(cluster: ThreatClusterCandidate, minScore = 4): boolean {
  return cluster.lat != null && cluster.lon != null && scoreWestBankClusterRelevance(cluster) >= minScore;
}

export function selectWestBankThreatClusters(clusters: ClusteredEvent[], limit = 12): ClusteredEvent[] {
  return clusters
    .filter((cluster) => isWestBankThreatCluster(cluster))
    .sort((a, b) =>
      (THREAT_PRIORITY[b.threat?.level ?? 'info'] ?? 0) - (THREAT_PRIORITY[a.threat?.level ?? 'info'] ?? 0) ||
      scoreWestBankClusterRelevance(b) - scoreWestBankClusterRelevance(a) ||
      b.sourceCount - a.sourceCount ||
      b.lastUpdated.getTime() - a.lastUpdated.getTime()
    )
    .slice(0, limit);
}

export function selectWestBankDigestItems(items: NewsItem[], limit = 5): NewsItem[] {
  const byLink = new Map<string, NewsItem>();

  for (const item of items) {
    if (!item?.link || !isWestBankRelevant(item)) continue;
    const existing = byLink.get(item.link);
    if (!existing) {
      byLink.set(item.link, item);
      continue;
    }

    const currentScore = scoreWestBankRelevance(item);
    const existingScore = scoreWestBankRelevance(existing);
    if (
      currentScore > existingScore ||
      (currentScore === existingScore && item.pubDate.getTime() > existing.pubDate.getTime())
    ) {
      byLink.set(item.link, item);
    }
  }

  return [...byLink.values()]
    .sort((a, b) =>
      scoreWestBankRelevance(b) - scoreWestBankRelevance(a) ||
      (b.importanceScore ?? 0) - (a.importanceScore ?? 0) ||
      b.pubDate.getTime() - a.pubDate.getTime()
    )
    .slice(0, limit);
}
