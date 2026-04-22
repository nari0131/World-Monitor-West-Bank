import type { WestBankDigestResponse } from '@/types';
import { toApiUrl } from './runtime';

export async function fetchWestBankDigest(lang: string, signal?: AbortSignal): Promise<WestBankDigestResponse> {
  const resp = await fetch(
    toApiUrl(`/api/westbank-digest?lang=${encodeURIComponent(lang)}`),
    { cache: 'no-cache', signal },
  );
  if (!resp.ok) throw new Error(`westbank-digest HTTP ${resp.status}`);
  return resp.json() as Promise<WestBankDigestResponse>;
}
