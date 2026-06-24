// Lyrics edge function: LRCLIB (primary, synced) + Genius (fallback metadata link)
// Public endpoint — no JWT required, safe to call from client.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENIUS_TOKEN = Deno.env.get('GENIUS_ACCESS_TOKEN') || '';

interface LyricsResponse {
  success: boolean;
  synced?: string | null;
  plain?: string | null;
  source?: 'lrclib' | 'kugou' | 'genius' | null;
  geniusUrl?: string | null;
  error?: string;
}

// ───────── KuGou lyrics (fallback for non-Western/CJK and rare tracks) ─────────
async function fetchKugou(artist: string, title: string, durationSec?: number): Promise<{ synced?: string; plain?: string } | null> {
  try {
    const keyword = `${clean(artist)} - ${clean(title)}`;
    const searchUrl = new URL('https://lyrics.kugou.com/search');
    searchUrl.searchParams.set('ver', '1');
    searchUrl.searchParams.set('man', 'yes');
    searchUrl.searchParams.set('client', 'pc');
    searchUrl.searchParams.set('keyword', keyword);
    if (durationSec && durationSec > 0) searchUrl.searchParams.set('duration', String(Math.round(durationSec * 1000)));

    const sr = await fetch(searchUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
    if (!sr.ok) return null;
    const sj = await sr.json();
    const cand = sj?.candidates?.[0];
    if (!cand?.id || !cand?.accesskey) return null;

    const dlUrl = new URL('https://lyrics.kugou.com/download');
    dlUrl.searchParams.set('ver', '1');
    dlUrl.searchParams.set('client', 'pc');
    dlUrl.searchParams.set('id', String(cand.id));
    dlUrl.searchParams.set('accesskey', String(cand.accesskey));
    dlUrl.searchParams.set('fmt', 'lrc');
    dlUrl.searchParams.set('charset', 'utf8');

    const dr = await fetch(dlUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
    if (!dr.ok) return null;
    const dj = await dr.json();
    if (!dj?.content) return null;
    const lrc = atob(String(dj.content));
    if (!lrc || lrc.length < 10) return null;
    const plain = lrc.replace(/\[[^\]]+\]/g, '').replace(/\n{2,}/g, '\n').trim() || undefined;
    return { synced: lrc, plain };
  } catch {
    return null;
  }
}

// ───────── Per-IP sliding-window rate limit (in-memory, per edge instance) ─────────
const RATE_LIMIT_MAX = 60;            // requests
const RATE_LIMIT_WINDOW_MS = 60_000;  // per minute
const ipHits = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return (fwd.split(',')[0] || req.headers.get('cf-connecting-ip') || 'unknown').trim();
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const arr = (ipHits.get(ip) || []).filter((t) => t > cutoff);
  if (arr.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, arr);
    return true;
  }
  arr.push(now);
  ipHits.set(ip, arr);
  // Opportunistic cleanup to bound memory
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      const filtered = v.filter((t) => t > cutoff);
      if (filtered.length === 0) ipHits.delete(k);
      else ipHits.set(k, filtered);
    }
  }
  return false;
}

// ───────── Tiny in-memory response cache (per edge instance) ─────────
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const cache = new Map<string, { at: number; payload: LyricsResponse }>();
function cacheGet(key: string): LyricsResponse | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) { cache.delete(key); return null; }
  return hit.payload;
}
function cacheSet(key: string, payload: LyricsResponse) {
  if (cache.size > 1000) {
    // drop oldest 200 entries
    const keys = [...cache.keys()].slice(0, 200);
    for (const k of keys) cache.delete(k);
  }
  cache.set(key, { at: Date.now(), payload });
}

function clean(s: string): string {
  return s
    .replace(/\(feat\.?[^)]*\)/gi, '')
    .replace(/\[feat\.?[^\]]*\]/gi, '')
    .replace(/\(.*?(remaster|remix|version|edit|live|deluxe).*?\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchLrclib(artist: string, title: string, durationSec?: number): Promise<{ synced?: string; plain?: string } | null> {
  try {
    if (durationSec && durationSec > 0) {
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(clean(artist))}&track_name=${encodeURIComponent(clean(title))}&duration=${Math.round(durationSec)}`;
      const r = await fetch(url, { headers: { 'User-Agent': 'Universflow/1.0 (https://universflow.in)' } });
      if (r.ok) {
        const j = await r.json();
        if (j && (j.syncedLyrics || j.plainLyrics)) {
          return { synced: j.syncedLyrics || undefined, plain: j.plainLyrics || undefined };
        }
      }
    }
    const sUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(clean(artist))}&track_name=${encodeURIComponent(clean(title))}`;
    const sr = await fetch(sUrl, { headers: { 'User-Agent': 'Universflow/1.0 (https://universflow.in)' } });
    if (!sr.ok) return null;
    const arr = await sr.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const synced = arr.find((x: any) => x?.syncedLyrics);
    const pick = synced || arr.find((x: any) => x?.plainLyrics) || arr[0];
    if (!pick) return null;
    return { synced: pick.syncedLyrics || undefined, plain: pick.plainLyrics || undefined };
  } catch {
    return null;
  }
}

async function fetchGeniusUrl(artist: string, title: string): Promise<string | null> {
  if (!GENIUS_TOKEN) return null;
  try {
    const q = encodeURIComponent(`${clean(title)} ${clean(artist)}`);
    const r = await fetch(`https://api.genius.com/search?q=${q}`, {
      headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const hit = j?.response?.hits?.[0]?.result;
    return hit?.url || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const ip = getClientIp(req);
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ success: false, error: 'Too many requests' } satisfies LyricsResponse), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const artist = String(body?.artist || '').trim();
    const title = String(body?.title || '').trim();
    const duration = Number(body?.duration) || undefined;

    if (!artist || !title) {
      return new Response(JSON.stringify({ success: false, error: 'artist and title required' } satisfies LyricsResponse), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cacheKey = `${clean(artist).toLowerCase()}|${clean(title).toLowerCase()}|${duration || 0}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400', 'X-Cache': 'HIT' },
      });
    }

    // Lazy Genius fallback: only call Genius if LRCLIB has nothing.
    const lrc = await fetchLrclib(artist, title, duration);
    const haveLyrics = !!(lrc?.synced || lrc?.plain);
    const geniusUrl = haveLyrics ? null : await fetchGeniusUrl(artist, title);

    const payload: LyricsResponse = {
      success: true,
      synced: lrc?.synced || null,
      plain: lrc?.plain || null,
      source: haveLyrics ? 'lrclib' : (geniusUrl ? 'genius' : null),
      geniusUrl: geniusUrl || null,
    };

    cacheSet(cacheKey, payload);

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (e) {
    console.error('lyrics error', e);
    return new Response(JSON.stringify({ success: false, error: 'An unexpected error occurred' } satisfies LyricsResponse), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
