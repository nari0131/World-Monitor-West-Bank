import type { ListFeedDigestResponse } from '../../generated/server/worldmonitor/news/v1/service_server.ts';
import type { WestBankDigestResponse } from '../../types/westbank.ts';
import { normalizeWestBankSeedDigest } from './westbank-normalize.ts';
import {
  buildWestBankMapEvents,
  buildWestBankSections,
  clusterWestBankItems,
  createEmptyWestBankDigestResponse,
} from './westbank-cluster.ts';
import { buildWestBankFailureSourceHealth, buildWestBankSourceHealth } from './westbank-source-health.ts';

export function buildWestBankDigestFromSeed(seedDigest: ListFeedDigestResponse): WestBankDigestResponse {
  const normalizedItems = normalizeWestBankSeedDigest(seedDigest);
  const clusters = clusterWestBankItems(normalizedItems);
  const response = createEmptyWestBankDigestResponse();

  response.generatedAt = seedDigest.generatedAt || response.generatedAt;
  response.sections = buildWestBankSections(clusters);
  response.sourceHealth = buildWestBankSourceHealth(seedDigest, normalizedItems);
  response.mapEvents = buildWestBankMapEvents(clusters);

  return response;
}

export function createWestBankDigestFailureResponse(error: unknown): WestBankDigestResponse {
  const response = createEmptyWestBankDigestResponse();
  response.sourceHealth = buildWestBankFailureSourceHealth(error);
  return response;
}
