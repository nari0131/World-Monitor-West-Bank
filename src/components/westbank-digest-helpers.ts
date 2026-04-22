import type { WestBankDigestSectionKey, WestBankSourceItem } from '@/types/westbank';

export function isLowConfidenceSection(key: WestBankDigestSectionKey): boolean {
  return key === 'lowConfidence';
}

export function getWestBankDigestMapTarget(
  item: Pick<WestBankSourceItem, 'lat' | 'lon'>,
): { lat: number; lon: number } | null {
  if (item.lat == null || item.lon == null) return null;
  return Number.isFinite(item.lat) && Number.isFinite(item.lon)
    ? { lat: item.lat, lon: item.lon }
    : null;
}
