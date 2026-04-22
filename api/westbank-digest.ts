export const config = { runtime: 'edge' };

// @ts-expect-error -- JS module, no declaration file
import { getCorsHeaders } from './_cors.js';
import { getWestBankDigest } from '../server/worldmonitor/westbank/v1/handler';

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
    const payload = await getWestBankDigest({
      request: req,
      pathParams: {},
      headers: Object.fromEntries(req.headers.entries()),
    }, { lang });

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...corsHeaders,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build West Bank digest';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...corsHeaders,
      },
    });
  }
}
