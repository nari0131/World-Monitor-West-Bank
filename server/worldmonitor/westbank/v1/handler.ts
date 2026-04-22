import type {
  ServerContext,
} from '../../../../src/generated/server/worldmonitor/news/v1/service_server.ts';
import type { WestBankDigestResponse } from '../../../../src/types/westbank.ts';
import { listFeedDigest } from '../../news/v1/list-feed-digest.ts';
import {
  buildWestBankDigestFromSeed,
  createWestBankDigestFailureResponse,
} from '../../../../src/services/intelligence/westbank-digest-builder.ts';

export interface GetWestBankDigestRequest {
  lang?: string;
}

export { buildWestBankDigestFromSeed };

export async function getWestBankDigest(
  ctx: ServerContext,
  req: GetWestBankDigestRequest = {},
): Promise<WestBankDigestResponse> {
  const lang = req.lang?.trim() || 'en';

  try {
    const seedDigest = await listFeedDigest(ctx, { variant: 'westbank', lang });
    return buildWestBankDigestFromSeed(seedDigest);
  } catch (error) {
    return createWestBankDigestFailureResponse(error);
  }
}
