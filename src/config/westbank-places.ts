import type { WestBankPlaceDefinition, WestBankPlaceKind } from '@/types';

const PLACE_KIND_PRIORITY: Record<WestBankPlaceKind, number> = {
  checkpoint: 5,
  camp: 4,
  area: 3,
  town: 2,
  governorate: 1,
};

function normalizeAlias(value: string): string {
  return value.trim().normalize('NFKC').toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAliasPattern(alias: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(normalizeAlias(alias))}(?![\\p{L}\\p{N}])`, 'giu');
}

export interface WestBankPlaceMatch {
  placeId: string;
  label: string;
  alias: string;
  kind: WestBankPlaceKind;
  start: number;
  end: number;
}

export const WESTBANK_PLACES: WestBankPlaceDefinition[] = [
  {
    id: 'jenin',
    label: 'Jenin',
    kind: 'town',
    governorate: 'Jenin',
    lat: 32.4615,
    lon: 35.2939,
    watchlist: true,
    aliases: ['Jenin Governorate', 'جنين', "ג'נין", 'Jenin city'],
  },
  {
    id: 'jenin-camp',
    label: 'Jenin Camp',
    kind: 'camp',
    governorate: 'Jenin',
    lat: 32.4696,
    lon: 35.3005,
    aliases: ['Jenin refugee camp', 'Jenin RC', 'مخيم جنين', "מחנה הפליטים ג'נין"],
  },
  {
    id: 'nablus',
    label: 'Nablus',
    kind: 'town',
    governorate: 'Nablus',
    lat: 32.2211,
    lon: 35.2544,
    watchlist: true,
    aliases: ['Nablus Governorate', 'نابلس', 'Shechem', 'שכם'],
  },
  {
    id: 'balata-camp',
    label: 'Balata Camp',
    kind: 'camp',
    governorate: 'Nablus',
    lat: 32.2095,
    lon: 35.2848,
    aliases: ['Balata refugee camp', 'مخيم بلاطة', 'מחנה בלאטה'],
  },
  {
    id: 'ramallah',
    label: 'Ramallah',
    kind: 'town',
    governorate: 'Ramallah and al-Bireh',
    lat: 31.9038,
    lon: 35.2034,
    watchlist: true,
    aliases: ['Ramallah Governorate', 'رام الله', 'אל בירה', 'Al-Bireh', 'al Bireh'],
  },
  {
    id: 'jalazone-camp',
    label: 'Jalazone Camp',
    kind: 'camp',
    governorate: 'Ramallah and al-Bireh',
    lat: 31.9477,
    lon: 35.2291,
    aliases: ['Jalazone refugee camp', 'مخيم الجلزون', 'מחנה ג׳לזון'],
  },
  {
    id: 'hebron',
    label: 'Hebron',
    kind: 'town',
    governorate: 'Hebron',
    lat: 31.5326,
    lon: 35.0998,
    watchlist: true,
    aliases: ['Hebron Governorate', 'الخليل', 'Al-Khalil', 'חברון'],
  },
  {
    id: 'fawwar-camp',
    label: 'Fawwar Camp',
    kind: 'camp',
    governorate: 'Hebron',
    lat: 31.4629,
    lon: 35.0975,
    aliases: ['Fawwar refugee camp', 'مخيم الفوار', 'מחנה אל-פוואר'],
  },
  {
    id: 'al-arroub-camp',
    label: 'Al-Arroub Camp',
    kind: 'camp',
    governorate: 'Hebron',
    lat: 31.6169,
    lon: 35.1305,
    aliases: ['Arroub Camp', 'Al Arroub Camp', 'مخيم العروب', 'מחנה אל-ערוב'],
  },
  {
    id: 'tulkarm',
    label: 'Tulkarm',
    kind: 'town',
    governorate: 'Tulkarm',
    lat: 32.3104,
    lon: 35.0286,
    watchlist: true,
    aliases: ['Tulkarm Governorate', 'طولكرم', 'טולכרם'],
  },
  {
    id: 'tulkarm-camp',
    label: 'Tulkarm Camp',
    kind: 'camp',
    governorate: 'Tulkarm',
    lat: 32.3158,
    lon: 35.0333,
    aliases: ['Tulkarm refugee camp', 'مخيم طولكرم', 'מחנה טולכרם'],
  },
  {
    id: 'nur-shams-camp',
    label: 'Nur Shams Camp',
    kind: 'camp',
    governorate: 'Tulkarm',
    lat: 32.3259,
    lon: 35.0651,
    aliases: ['Nur Shams', 'Nur Shams refugee camp', 'مخيم نور شمس', 'نور شمس', 'מחנה נור א-שמס'],
  },
  {
    id: 'tubas',
    label: 'Tubas',
    kind: 'town',
    governorate: 'Tubas',
    lat: 32.3209,
    lon: 35.3695,
    watchlist: true,
    aliases: ['Tubas Governorate', 'طوباس', 'טובאס'],
  },
  {
    id: 'qalqilya',
    label: 'Qalqilya',
    kind: 'town',
    governorate: 'Qalqilya',
    lat: 32.1897,
    lon: 34.9706,
    watchlist: true,
    aliases: ['Qalqilya Governorate', 'قلقيلية', 'קלקיליה'],
  },
  {
    id: 'bethlehem',
    label: 'Bethlehem',
    kind: 'town',
    governorate: 'Bethlehem',
    lat: 31.7054,
    lon: 35.2024,
    watchlist: true,
    aliases: ['Bethlehem Governorate', 'بيت لحم', 'בית לחם'],
  },
  {
    id: 'aida-camp',
    label: 'Aida Camp',
    kind: 'camp',
    governorate: 'Bethlehem',
    lat: 31.7147,
    lon: 35.1933,
    aliases: ['Aida refugee camp', 'Aida Camp (Bethlehem)', 'مخيم عايدة', 'מחנה עאידה'],
  },
  {
    id: 'jericho',
    label: 'Jericho',
    kind: 'town',
    governorate: 'Jericho',
    lat: 31.8667,
    lon: 35.45,
    watchlist: true,
    aliases: ['Jericho Governorate', 'أريحا', 'יריחו'],
  },
  {
    id: 'aqabat-jabr-camp',
    label: 'Aqabat Jabr Camp',
    kind: 'camp',
    governorate: 'Jericho',
    lat: 31.8418,
    lon: 35.4625,
    aliases: ['Aqabat Jabr refugee camp', 'مخيم عقبة جبر', 'מחנה עקבת ג׳בר'],
  },
  {
    id: 'salfit',
    label: 'Salfit',
    kind: 'town',
    governorate: 'Salfit',
    lat: 32.0833,
    lon: 35.1833,
    watchlist: true,
    aliases: ['Salfit Governorate', 'سلفيت', 'סלפית'],
  },
  {
    id: 'east-jerusalem',
    label: 'East Jerusalem',
    kind: 'area',
    governorate: 'Jerusalem',
    lat: 31.7833,
    lon: 35.2333,
    watchlist: true,
    aliases: ['Occupied East Jerusalem', 'القدس الشرقية', 'مشرق القدس', 'East al-Quds', 'מזרח ירושלים', 'במזרח ירושלים'],
  },
  {
    id: 'shuafat-camp',
    label: 'Shuafat Camp',
    kind: 'camp',
    governorate: 'Jerusalem',
    lat: 31.8088,
    lon: 35.2401,
    aliases: ['Shuafat refugee camp', 'Shoafat Camp', 'مخيم شعفاط', 'מחנה שועפאט'],
  },
  {
    id: 'masafer-yatta',
    label: 'Masafer Yatta',
    kind: 'area',
    governorate: 'Hebron',
    lat: 31.423,
    lon: 35.105,
    watchlist: true,
    aliases: ['Masafer Yatta villages', 'مسافر يطا', 'מסאפר יטא'],
  },
  {
    id: 'qalandia-checkpoint',
    label: 'Qalandia Checkpoint',
    kind: 'checkpoint',
    governorate: 'Jerusalem',
    lat: 31.8595,
    lon: 35.2173,
    aliases: ['Qalandia Crossing', 'Kalandia Checkpoint', 'قلنديا', 'קלנדיה'],
  },
  {
    id: 'huwwara-checkpoint',
    label: 'Huwwara Checkpoint',
    kind: 'checkpoint',
    governorate: 'Nablus',
    lat: 32.1529,
    lon: 35.2611,
    aliases: ['Huwara Checkpoint', 'Huwwara Crossing', 'حوارة', 'חווארה'],
  },
];

export const WESTBANK_PLACE_BY_ID = new Map(WESTBANK_PLACES.map((place) => [place.id, place]));

export const WESTBANK_WATCHLIST = WESTBANK_PLACES
  .filter((place) => place.watchlist)
  .map((place) => place.label);

const WESTBANK_PLACE_LABEL_INDEX = new Map(
  WESTBANK_PLACES.map((place) => [normalizeAlias(place.label), place]),
);

const WESTBANK_ALIAS_SPECS = WESTBANK_PLACES
  .flatMap((place) => {
    const aliases = new Set([place.label, ...place.aliases]);
    return [...aliases].map((alias) => ({
      alias,
      normalizedAlias: normalizeAlias(alias),
      place,
      pattern: buildAliasPattern(alias),
    }));
  })
  .sort((a, b) =>
    PLACE_KIND_PRIORITY[b.place.kind] - PLACE_KIND_PRIORITY[a.place.kind] ||
    b.normalizedAlias.length - a.normalizedAlias.length ||
    a.place.label.localeCompare(b.place.label),
  );

function overlapsExistingMatch(start: number, end: number, matches: WestBankPlaceMatch[]): boolean {
  return matches.some((match) => start < match.end && end > match.start);
}

export function getWestBankPlaceById(id: string): WestBankPlaceDefinition | undefined {
  return WESTBANK_PLACE_BY_ID.get(id);
}

export function getWestBankPlaceByLabel(label: string): WestBankPlaceDefinition | undefined {
  return WESTBANK_PLACE_LABEL_INDEX.get(normalizeAlias(label));
}

export function findWestBankPlaceMatches(text: string): WestBankPlaceMatch[] {
  const normalizedText = normalizeAlias(text);
  const matches: WestBankPlaceMatch[] = [];

  for (const spec of WESTBANK_ALIAS_SPECS) {
    if (matches.some((match) => match.placeId === spec.place.id)) continue;

    spec.pattern.lastIndex = 0;
    let hit: RegExpExecArray | null;
    while ((hit = spec.pattern.exec(normalizedText)) !== null) {
      const start = hit.index;
      const end = start + hit[0].length;
      if (overlapsExistingMatch(start, end, matches)) continue;

      matches.push({
        placeId: spec.place.id,
        label: spec.place.label,
        alias: spec.alias,
        kind: spec.place.kind,
        start,
        end,
      });
      break;
    }
  }

  return matches.sort((a, b) => a.start - b.start || PLACE_KIND_PRIORITY[b.kind] - PLACE_KIND_PRIORITY[a.kind]);
}

export function findWestBankPlacesInText(text: string): WestBankPlaceDefinition[] {
  return findWestBankPlaceMatches(text)
    .map((match) => WESTBANK_PLACE_BY_ID.get(match.placeId))
    .filter((place): place is WestBankPlaceDefinition => !!place);
}
