import type {
  ThreatLevel,
  WestBankDigestResponse,
  WestBankDigestSectionKey,
  WestBankSourceHealth,
  WestBankSourceItem,
} from '@/types';

export interface ThreatBoardItem extends WestBankSourceItem {
  sectionKeys: Array<WestBankDigestSectionKey | 'mapped'>;
  sectionLabels: string[];
  isMapped: boolean;
}

const THREAT_PRIORITY: Record<ThreatLevel, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const SECTION_PRIORITY: Record<WestBankDigestSectionKey | 'mapped', number> = {
  mapped: 0,
  now: 1,
  last6h: 2,
  mobility: 3,
  settlerViolence: 4,
  officialAlerts: 5,
  lowConfidence: 6,
};

function getItemTimeMs(item: Pick<WestBankSourceItem, 'publishedAt'>): number {
  const parsed = new Date(item.publishedAt).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSectionPriority(item: ThreatBoardItem): number {
  return Math.min(...item.sectionKeys.map((key) => SECTION_PRIORITY[key] ?? 99));
}

function mergeItem(
  items: Map<string, ThreatBoardItem>,
  item: WestBankSourceItem,
  sectionKey: WestBankDigestSectionKey | 'mapped',
  sectionLabel: string,
  mapped: boolean,
): void {
  const existing = items.get(item.id);
  if (existing) {
    if (!existing.sectionKeys.includes(sectionKey)) existing.sectionKeys.push(sectionKey);
    if (!existing.sectionLabels.includes(sectionLabel)) existing.sectionLabels.push(sectionLabel);
    if (mapped) existing.isMapped = true;
    if ((item.sourceCount ?? 1) > (existing.sourceCount ?? 1)) existing.sourceCount = item.sourceCount;
    if (item.lat != null && item.lon != null) {
      existing.lat = item.lat;
      existing.lon = item.lon;
      existing.placeLabel = item.placeLabel ?? existing.placeLabel;
      existing.placeId = item.placeId ?? existing.placeId;
    }
    return;
  }

  items.set(item.id, {
    ...item,
    sectionKeys: [sectionKey],
    sectionLabels: [sectionLabel],
    isMapped: mapped,
  });
}

export function flattenThreatBoardItems(digest: WestBankDigestResponse): ThreatBoardItem[] {
  const items = new Map<string, ThreatBoardItem>();

  for (const section of digest.sections) {
    for (const item of section.items) {
      mergeItem(items, item, section.key, section.label, false);
    }
  }

  for (const item of digest.mapEvents) {
    mergeItem(items, item, 'mapped', 'Mapped', true);
  }

  return [...items.values()].sort((left, right) => {
    const threatDelta =
      (THREAT_PRIORITY[right.threatLevel ?? 'info'] ?? 0) -
      (THREAT_PRIORITY[left.threatLevel ?? 'info'] ?? 0);
    if (threatDelta !== 0) return threatDelta;

    const sourceDelta = (right.sourceCount ?? 1) - (left.sourceCount ?? 1);
    if (sourceDelta !== 0) return sourceDelta;

    const timeDelta = getItemTimeMs(right) - getItemTimeMs(left);
    if (timeDelta !== 0) return timeDelta;

    return getSectionPriority(left) - getSectionPriority(right);
  });
}

export function summarizeSourceHealth(healthEntries: WestBankSourceHealth[]): {
  ok: number;
  degraded: number;
  down: number;
} {
  return healthEntries.reduce(
    (summary, entry) => {
      summary[entry.status] += 1;
      return summary;
    },
    { ok: 0, degraded: 0, down: 0 },
  );
}
