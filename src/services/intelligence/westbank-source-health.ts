import type { ListFeedDigestResponse } from '../../generated/server/worldmonitor/news/v1/service_server.ts';
import { WESTBANK_SOURCES } from '../../config/westbank-sources.ts';
import type { WestBankSourceHealth, WestBankSourceItem } from '../../types/westbank.ts';

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
      return {
        sourceId: source.id,
        sourceName: source.name,
        status: 'degraded',
        message: 'Pending dedicated source integration',
      } satisfies WestBankSourceHealth;
    }

    const feedStatus = seedDigest.feedStatuses?.[source.name];
    if (feedStatus === 'timeout') {
      return {
        sourceId: source.id,
        sourceName: source.name,
        status: 'down',
        message: 'Feed timed out during the last digest run',
      } satisfies WestBankSourceHealth;
    }

    if (feedStatus === 'empty') {
      return {
        sourceId: source.id,
        sourceName: source.name,
        status: 'degraded',
        message: 'No recent West Bank items in the current digest window',
      } satisfies WestBankSourceHealth;
    }

    const latestSeen = latestBySource.get(source.id);
    return {
      sourceId: source.id,
      sourceName: source.name,
      status: 'ok',
      staleMinutes: latestSeen ? Math.max(0, Math.round((now - latestSeen) / 60_000)) : undefined,
      message: latestSeen ? undefined : 'No mapped items in the current digest window',
    } satisfies WestBankSourceHealth;
  });
}

