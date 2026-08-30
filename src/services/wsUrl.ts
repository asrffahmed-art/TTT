// THOTH — Live WebSocket base URL resolver.
// Priority: VITE_LIVE_WS_URL (baked at build time, e.g. wss://thoth-live.up.railway.app)
// otherwise same-origin (works on Vercel via Fluid WS and on standalone deploys).
export function liveWsBase(): string {
  const envUrl = (import.meta as any)?.env?.VITE_LIVE_WS_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

export function liveWsUrl(pathAndQuery: string): string {
  const cleanPath = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  return `${liveWsBase()}${cleanPath}`;
}
