import type { ListFeedDigestResponse } from '../../generated/server/worldmonitor/news/v1/service_server.ts';
import { WESTBANK_SOURCES } from '../../config/westbank-sources.ts';
import type {
  WestBankSourceDefinition,
  WestBankSourceHealth,
  WestBankSourceHealthCode,
  WestBankSourceItem,
} from '../../types/westbank.ts';

const STALE_MINUTES_BY_TYPE: Record<WestBankSourceDefinition['type'], number> = {
  rss: 180,
  telegram: 15,
  oref: 10,
  acled: 360,
  gdelt: 180,
};

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

export function classifyWestBankDigestFailure(error: unknown): {
  code: WestBankSourceHealthCode;
  message: string;
} {
  const message = error instanceof Error && error.message.trim()
    ? error.message.trim()
    : 'Digest builder failed before source health could be refreshed.';
  const code = classifySourceHealthCode(message) ?? 'digest_unavailable';
  return { code, message };
}

export function buildWestBankFailureSourceHealth(error: unknown): WestBankSourceHealth[] {
  const failure = classifyWestBankDigestFailure(error);

  return WESTBANK_SOURCES.map((source) => buildHealthEntry(source, {
    status: source.type === 'rss' ? 'down' : 'degraded',
    code: failure.code,
    message: failure.message,
  }));
}

export function buildWestBankSourceHealth(
  seedDigest: ListFeedDigestResponse,
  items: Pick<WestBankSourceItem, 'sourceId' | 'publishedAt'>[],
  now = Date.now(),
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
