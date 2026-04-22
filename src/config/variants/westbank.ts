import type { PanelConfig, MapLayers } from '@/types';
import type { VariantConfig } from './base';

export const WESTBANK_PANEL_NAMES = {
  map: 'Israel + OPT Threat Map',
  digest: 'West Bank Digest',
} as const;

export const WESTBANK_SOURCE_REGION_LABEL_KEY = 'header.sourceRegionWestBank' as const;
export const WESTBANK_PANEL_KEYS = ['map', 'westbank-digest'] as const;

export const DEFAULT_PANELS: Record<string, PanelConfig> = {
  map: { name: WESTBANK_PANEL_NAMES.map, enabled: true, priority: 1 },
  'westbank-digest': { name: WESTBANK_PANEL_NAMES.digest, enabled: true, priority: 1 },
};

export const DEFAULT_MAP_LAYERS: MapLayers = {
  iranAttacks: false,
  gpsJamming: false,
  satellites: false,
  conflicts: false,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  radiationWatch: false,
  sanctions: false,
  weather: false,
  economic: false,
  waterways: false,
  outages: false,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: false,
  spaceports: false,
  minerals: false,
  fires: false,
  ucdpEvents: false,
  displacement: false,
  climate: false,
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  ciiChoropleth: false,
  resilienceScore: false,
  dayNight: false,
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  diseaseOutbreaks: false,
};

export const MOBILE_DEFAULT_MAP_LAYERS: MapLayers = {
  ...DEFAULT_MAP_LAYERS,
};

export const VARIANT_CONFIG: VariantConfig = {
  name: 'westbank',
  description: 'West Bank and Israel + OPT operational monitor',
  panels: DEFAULT_PANELS,
  mapLayers: DEFAULT_MAP_LAYERS,
  mobileMapLayers: MOBILE_DEFAULT_MAP_LAYERS,
};
