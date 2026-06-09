/**
 * Resolve a Lovable CDN asset URL (`/__l5e/assets-v1/...`) into an absolute
 * URL when the app is running in a Capacitor / native WebView context where
 * the origin is `capacitor://localhost`, `https://localhost` or `file://` —
 * none of which serve `/__l5e/`. In those contexts we point at the published
 * web origin so the asset still loads.
 *
 * On a normal web origin (lovable preview, lovable.app, universflow.in)
 * we leave the URL relative so it loads from the same origin / CDN edge.
 */
const PRODUCTION_ORIGIN = 'https://universflow.in';

export function cdnAssetUrl(url: string | null | undefined): string {
  if (!url) return '';
  // Already absolute (http/https/data/blob) — pass through.
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (!url.startsWith('/__l5e/')) return url;
  try {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    // Native WebView shells (Capacitor / Median) — relative paths don't
    // resolve to the CDN, so anchor to the production web origin.
    const isWebOrigin =
      (proto === 'http:' || proto === 'https:') &&
      host !== 'localhost' &&
      !host.startsWith('127.');
    if (!isWebOrigin) return `${PRODUCTION_ORIGIN}${url}`;
  } catch {
    return `${PRODUCTION_ORIGIN}${url}`;
  }
  return url;
}
