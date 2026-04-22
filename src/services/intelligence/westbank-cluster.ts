import type {
  WestBankDigestResponse,
  WestBankDigestSection,
  WestBankDigestSectionKey,
  WestBankSourceItem,
} from '../../types/westbank.ts';
import type { NormalizedWestBankItem, WestBankCluster } from './westbank-score.ts';
import {
  compareWestBankClusters,
  compareWestBankItems,
  deriveVerification,
} from './westbank-score.ts';

const CLUSTER_WINDOW_MS = 2 * 60 * 60 * 1000;
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

function getClusterKey(item: NormalizedWestBankItem): string {
  const bucket = Math.floor(item.publishedAtMs / CLUSTER_WINDOW_MS);
  if (!item.placeId) return `${item.sourceId}:${item.category}:${bucket}:${item.id}`;
  return `${item.placeId}:${item.category}:${bucket}`;
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

export function clusterWestBankItems(items: NormalizedWestBankItem[]): WestBankCluster[] {
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

export function buildWestBankSections(clusters: WestBankCluster[], now = Date.now()): WestBankDigestSection[] {
  return [
    createSection('now', clusters, (cluster) => now - cluster.publishedAtMs <= 2 * 60 * 60 * 1000),
    createSection('last6h', clusters, (cluster) => now - cluster.publishedAtMs <= 6 * 60 * 60 * 1000),
    createSection('mobility', clusters, (cluster) => cluster.category === 'mobility'),
    createSection('settlerViolence', clusters, (cluster) => cluster.category === 'settler-violence'),
    createSection('officialAlerts', clusters, (cluster) => cluster.category === 'official-alert' || cluster.verification === 'official'),
    createSection('lowConfidence', clusters, (cluster) => cluster.verification === 'unresolved' || cluster.verification === 'single-source'),
  ];
}

export function buildWestBankMapEvents(clusters: WestBankCluster[], limit = 20): WestBankSourceItem[] {
  return clusters
    .filter((cluster) => cluster.lat != null && cluster.lon != null)
    .sort(compareWestBankClusters)
    .slice(0, limit)
    .map(toRepresentativeItem);
}

export function createEmptyWestBankDigestResponse(): WestBankDigestResponse {
  return {
    generatedAt: new Date().toISOString(),
    sections: (Object.keys(SECTION_LABELS) as WestBankDigestSectionKey[]).map((key) => ({
      key,
      label: SECTION_LABELS[key],
      items: [],
    })),
    sourceHealth: [],
    mapEvents: [],
  };
}

