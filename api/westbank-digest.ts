export const config = { runtime: 'nodejs' };

import type { ListFeedDigestResponse } from '../src/generated/server/worldmonitor/news/v1/service_server.ts';
import {
  buildWestBankDigestFromSeed,
  createWestBankDigestFailureResponse,
} from '../src/services/intelligence/westbank-digest-builder.ts';

type NodeRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};

type NodeResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): NodeResponse;
  send(body: string): void;
  end(body?: string): void;
};

function getHeader(headers: NodeRequest['headers'], name: string): string {
  const value = headers[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function getRequestOrigin(req: NodeRequest): string {
  const proto = getHeader(req.headers, 'x-forwarded-proto') || 'https';
  const host = getHeader(req.headers, 'x-forwarded-host') || getHeader(req.headers, 'host') || 'world-monitor-west-bank.vercel.app';
  return `${proto}://${host}`;
}

function setCorsHeaders(res: NodeResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-WorldMonitor-Key, X-Api-Key, X-Widget-Key, X-Pro-Key');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
}

async function fetchWestBankSeedDigest(req: NodeRequest, lang: string): Promise<ListFeedDigestResponse> {
  const origin = getRequestOrigin(req);
  const url = new URL('/api/news/v1/list-feed-digest', origin);
  url.searchParams.set('variant', 'westbank');
  url.searchParams.set('lang', lang);

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Seed digest HTTP ${response.status}`);
  }

  return await response.json() as ListFeedDigestResponse;
}

export default async function handler(req: NodeRequest, res: NodeResponse): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).send(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const url = new URL(req.url ?? '/api/westbank-digest', getRequestOrigin(req));
    const lang = url.searchParams.get('lang') ?? 'en';
    const seedDigest = await fetchWestBankSeedDigest(req, lang);
    const payload = buildWestBankDigestFromSeed(seedDigest);
    res.status(200).send(JSON.stringify(payload));
  } catch (error) {
    const payload = createWestBankDigestFailureResponse(error);
    res.status(200).send(JSON.stringify(payload));
  }
}
