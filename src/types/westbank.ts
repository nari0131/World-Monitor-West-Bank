export type WestBankSourceType = 'rss' | 'telegram' | 'oref' | 'acled' | 'gdelt';

export type WestBankSourceTier = 1 | 2 | 3;

export type VerificationClass = 'official' | 'corroborated' | 'single-source' | 'unresolved';

export type WestBankPlaceKind = 'governorate' | 'town' | 'camp' | 'checkpoint' | 'area';

export type WestBankThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type WestBankEventCategory =
  | 'conflict'
  | 'protest'
  | 'mobility'
  | 'settler-violence'
  | 'official-alert'
  | 'raid'
  | 'arrest'
  | 'demolition'
  | 'general';

export type WestBankDigestSectionKey =
  | 'now'
  | 'last6h'
  | 'mobility'
  | 'settlerViolence'
  | 'officialAlerts'
  | 'lowConfidence';

export type WestBankSourceHealthStatus = 'ok' | 'degraded' | 'down';

export interface WestBankSourceDefinition {
  id: string;
  name: string;
  type: WestBankSourceType;
  tier: WestBankSourceTier;
  verification: VerificationClass;
  defaultEnabled: boolean;
  aliases?: string[];
  notes?: string;
}

export interface WestBankPlaceDefinition {
  id: string;
  label: string;
  kind: WestBankPlaceKind;
  governorate: string;
  lat: number;
  lon: number;
  aliases: string[];
  watchlist?: boolean;
}

export interface WestBankSourceItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: WestBankSourceType;
  verification: VerificationClass;
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
}

export interface WestBankDigestSection {
  key: WestBankDigestSectionKey;
  label: string;
  items: WestBankSourceItem[];
}

export interface WestBankSourceHealth {
  sourceId: string;
  sourceName: string;
  status: WestBankSourceHealthStatus;
  staleMinutes?: number;
  message?: string;
}

export interface WestBankDigestResponse {
  generatedAt: string;
  sections: WestBankDigestSection[];
  sourceHealth: WestBankSourceHealth[];
  mapEvents: WestBankSourceItem[];
}
