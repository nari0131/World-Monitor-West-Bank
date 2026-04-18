const buildVariant = (() => {
  try {
    return import.meta.env?.VITE_VARIANT || 'full';
  } catch {
    return 'full';
  }
})();

const VERCEL_WESTBANK_HOST_RE = /^world-monitor-west-bank(?:-[a-z0-9-]+)?\.vercel\.app$/i;

export function resolveHostedVariant(hostname: string, fallbackVariant = buildVariant): string {
  const h = hostname.toLowerCase();
  if (h.startsWith('tech.')) return 'tech';
  if (h.startsWith('finance.')) return 'finance';
  if (h.startsWith('happy.')) return 'happy';
  if (h.startsWith('commodity.')) return 'commodity';
  if (h.startsWith('westbank.') || VERCEL_WESTBANK_HOST_RE.test(h)) return 'westbank';
  if (h.endsWith('.vercel.app')) return fallbackVariant;
  return 'full';
}

export const SITE_VARIANT: string = (() => {
  if (typeof window === 'undefined') return buildVariant;

  const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
  if (isTauri) {
    const stored = localStorage.getItem('worldmonitor-variant');
    if (stored === 'tech' || stored === 'full' || stored === 'finance' || stored === 'happy' || stored === 'commodity' || stored === 'westbank') return stored;
    return buildVariant;
  }

  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') {
    const stored = localStorage.getItem('worldmonitor-variant');
    if (stored === 'tech' || stored === 'full' || stored === 'finance' || stored === 'happy' || stored === 'commodity' || stored === 'westbank') return stored;
    return buildVariant;
  }

  return resolveHostedVariant(h);
})();
