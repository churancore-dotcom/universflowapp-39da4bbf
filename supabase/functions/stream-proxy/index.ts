// stream-proxy
// ----------------------------------------------------------------------------
// Re-streams upstream audio with proper CORS + Range headers so the browser's
// WebAudio graph can attach a MediaElementSource without tainting it. This is
// what makes the EQ / reverb / spatial / studio-space chain audibly work for
// streams that ship from servers without ACAO headers (Invidious, some JioSaavn
// CDN paths, custom workers).
//
// Why a dedicated function (vs reusing music-indexer):
//   - Single responsibility, cleaner cache + range semantics.
//   - Wider, audit-friendly allowlist; no accidental open proxy.
//   - Tight Cache-Control so repeat plays hit the edge cache instead of egress.
//   - verify_jwt = false (audio elements can't carry an Authorization header).
// ----------------------------------------------------------------------------

const ALLOWED_HOST_SUFFIXES = [
  // JioSaavn
  '.saavncdn.com',
  'saavncdn.com',
  'jiosaavn-api.universflow.workers.dev',
  // YouTube / Invidious mirrors
  '.googlevideo.com',
  '.youtube.com',
  'youtu.be',
  '.private.coffee',
  '.moomoo.me',
  '.syncpundit.io',
  '.mha.fi',
  '.leptons.xyz',
  '.r4fo.com',
  '.piped.yt',
  '.piped.video',
  '.piped.privacydev.net',
  '.piped.kavin.rocks',
  '.kavin.rocks',
  '.piped.tokhmi.xyz',
  '.piped.adminforge.de',
  '.projectsegfau.lt',
  '.invidious.io',
  '.invidious.privacydev.net',
  '.invidious.fdn.fr',
  '.invidious.projectsegfau.lt',
  '.invidious.protokolla.fi',
  '.protokolla.fi',
  '.nerdvpn.de',
  '.privacyredirect.com',
  '.nadeko.net',
  '.datura.network',
  '.invidious.f5.si',
  '.f5.si',
  '.thepixora.com',
  '.yewtu.be',
  // Audius
  '.audius.co',
  'audius.co',
  '.the-standard.io',
  'the-standard.io',
];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'range, content-type, accept',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type',
};

// Per-IP sliding-window rate limiter (in-memory; resets per cold start).
const RATE_LIMIT_MAX = 240;          // 240 reqs/min/IP — generous for seek + range bursts
const RATE_LIMIT_WINDOW_MS = 60_000;
const ipHits = new Map<string, number[]>();

function clientIp(req: Request): string {
  return (
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  return hits.length <= RATE_LIMIT_MAX;
}

function isAllowed(target: string): boolean {
  let url: URL;
  try { url = new URL(target); } catch { return false; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => {
    const bare = suffix.startsWith('.') ? suffix.slice(1) : suffix;
    return host === bare || host.endsWith(suffix);
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  const reqUrl = new URL(req.url);
  const target = reqUrl.searchParams.get('u') || reqUrl.searchParams.get('url');
  if (!target) {
    return new Response('Missing ?u=<audio url>', { status: 400, headers: CORS_HEADERS });
  }

  if (!isAllowed(target)) {
    return new Response('Host not allowed', { status: 400, headers: CORS_HEADERS });
  }

  const ip = clientIp(req);
  if (!checkRate(ip)) {
    return new Response('Too many requests', {
      status: 429,
      headers: { ...CORS_HEADERS, 'retry-after': '60' },
    });
  }

  const range = req.headers.get('range');
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: {
        ...(range ? { range } : {}),
        'user-agent': 'Mozilla/5.0 (UniversFlow Stream Proxy)',
        accept: '*/*',
      },
      redirect: 'follow',
    });
  } catch (err) {
    console.error('[stream-proxy] upstream fetch failed:', err);
    return new Response('Upstream fetch failed', { status: 502, headers: CORS_HEADERS });
  }

  const headers = new Headers(CORS_HEADERS);
  ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'].forEach((name) => {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  });
  // Force a useful cache lifetime so repeat plays don't re-pull from upstream.
  // 1 hour public + 1 day SWR is a good balance for music CDNs.
  headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400');
  if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes');

  return new Response(req.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
});
