export const config = { runtime: 'edge' };

// @ts-expect-error -- JS module, no declaration file
import { getCorsHeaders } from './_cors.js';
import type { ListFeedDigestResponse } from '../src/generated/server/worldmonitor/news/v1/service_server.ts';
import {
  buildWestBankDigestFromSeed,
  createWestBankDigestFailureResponse,
} from '../src/services/intelligence/westbank-digest-builder.ts';

async function fetchWestBankSeedDigest(req: Request, lang: string): Promise<ListFeedDigestResponse> {
  const url = new URL(req.url);
  url.pathname = '/api/news/v1/list-feed-digest';
  url.search = '';
  url.searchParams.set('variant', 'westbank');
  url.searchParams.set('lang', lang);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Seed digest HTTP ${response.status}`);
  }

  return await response.json() as ListFeedDigestResponse;
}

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req) as Record<string, string>;

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...corsHeaders,
      },
    });
  }

  try {
    const url = new URL(req.url);
    const lang = url.searchParams.get('lang') ?? 'en';
    const seedDigest = await fetchWestBankSeedDigest(req, lang);
    const payload = buildWestBankDigestFromSeed(seedDigest);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...corsHeaders,
      },
    });
  } catch (error) {
    const payload = createWestBankDigestFailureResponse(error);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...corsHeaders,
      },
    });
  }
}
