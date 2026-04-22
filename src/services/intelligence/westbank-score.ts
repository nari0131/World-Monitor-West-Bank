import type {
  VerificationClass,
  WestBankEventCategory,
  WestBankSourceItem,
  WestBankSourceTier,
  WestBankThreatLevel,
} from '../../types/westbank.ts';

const THREAT_PRIORITY: Record<WestBankThreatLevel, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const TIER_PRIORITY: Record<WestBankSourceTier, number> = {
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

export interface NormalizedWestBankItem extends WestBankSourceItem {
  publishedAtMs: number;
  priorityScore: number;
  sourceTier: WestBankSourceTier;
}

export interface WestBankCluster {
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
}

export function compareThreatLevels(
  left: WestBankThreatLevel | undefined,
  right: WestBankThreatLevel | undefined,
): number {
  return (THREAT_PRIORITY[left ?? 'info'] ?? 0) - (THREAT_PRIORITY[right ?? 'info'] ?? 0);
}

export function deriveVerification(items: Pick<NormalizedWestBankItem, 'verification' | 'sourceId'>[]): VerificationClass {
  if (items.some((item) => item.verification === 'official')) return 'official';
  if (new Set(items.map((item) => item.sourceId)).size >= 2) return 'corroborated';
  return items[0]?.verification ?? 'unresolved';
}

export function scoreWestBankItemPriority(item: Pick<NormalizedWestBankItem, 'threatLevel' | 'sourceTier' | 'verification' | 'publishedAtMs'>): number {
  const threatScore = THREAT_PRIORITY[item.threatLevel ?? 'info'] * 100;
  const tierScore = TIER_PRIORITY[item.sourceTier] * 20;
  const verificationScore = VERIFICATION_PRIORITY[item.verification] * 15;
  const ageMinutes = Math.max(0, (Date.now() - item.publishedAtMs) / 60_000);
  const recencyScore = Math.max(0, 60 - ageMinutes);
  return Math.round(threatScore + tierScore + verificationScore + recencyScore);
}

export function compareWestBankItems(left: NormalizedWestBankItem, right: NormalizedWestBankItem): number {
  return (
    right.priorityScore - left.priorityScore ||
    compareThreatLevels(right.threatLevel, left.threatLevel) ||
    right.publishedAtMs - left.publishedAtMs ||
    (right.sourceCount ?? 1) - (left.sourceCount ?? 1)
  );
}

export function compareWestBankClusters(left: WestBankCluster, right: WestBankCluster): number {
  return (
    compareThreatLevels(right.threatLevel, left.threatLevel) ||
    VERIFICATION_PRIORITY[right.verification] - VERIFICATION_PRIORITY[left.verification] ||
    right.sourceCount - left.sourceCount ||
    right.publishedAtMs - left.publishedAtMs ||
    right.representative.priorityScore - left.representative.priorityScore
  );
}

