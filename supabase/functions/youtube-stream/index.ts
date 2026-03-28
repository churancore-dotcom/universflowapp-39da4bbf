import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Multiple Piped instances for reliability
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.moomoo.me',
  'https://piped-api.lunar.icu',
];

// Invidious instances as fallback
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.privacyredirect.com',
  'https://invidious.perennialte.ch',
  'https://invidious.nerdvpn.de',
  'https://iv.datura.network',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface StreamResult {
  audioUrl: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  duration?: number;
  source: string;
}

async function tryPiped(videoId: string, instance: string): Promise<StreamResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${instance}/streams/${videoId}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      await resp.text();
      return null;
    }

    const data = await resp.json();
    const audioStreams = data.audioStreams || [];

    // Sort by bitrate desc, prefer m4a/mp4
    const sorted = audioStreams
      .filter((s: any) => s.url && s.mimeType)
      .sort((a: any, b: any) => {
        const aM4a = a.mimeType.includes('mp4') || a.mimeType.includes('m4a') ? 1 : 0;
        const bM4a = b.mimeType.includes('mp4') || b.mimeType.includes('m4a') ? 1 : 0;
        if (bM4a !== aM4a) return bM4a - aM4a;
        return (b.bitrate || 0) - (a.bitrate || 0);
      });

    if (sorted.length === 0) return null;

    const best = sorted[0];
    const title = data.title || '';
    const uploader = (data.uploader || '').replace(/ - Topic$/, '');

    return {
      audioUrl: best.url,
      title,
      artist: uploader,
      thumbnail: data.thumbnailUrl || '',
      duration: data.duration || 0,
      source: 'piped',
    };
  } catch {
    return null;
  }
}

async function tryInvidious(videoId: string, instance: string): Promise<StreamResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${instance}/api/v1/videos/${videoId}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      await resp.text();
      return null;
    }

    const data = await resp.json();
    const adaptiveFormats = data.adaptiveFormats || [];

    const audioFormats = adaptiveFormats
      .filter((f: any) => f.type?.startsWith('audio/') && f.url)
      .sort((a: any, b: any) => {
        const aM4a = a.type.includes('mp4') ? 1 : 0;
        const bM4a = b.type.includes('mp4') ? 1 : 0;
        if (bM4a !== aM4a) return bM4a - aM4a;
        return (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0);
      });

    if (audioFormats.length === 0) return null;

    const best = audioFormats[0];

    return {
      audioUrl: best.url,
      title: data.title || '',
      artist: (data.author || '').replace(/ - Topic$/, ''),
      thumbnail: data.videoThumbnails?.find((t: any) => t.quality === 'maxresdefault')?.url
        || data.videoThumbnails?.[0]?.url || '',
      duration: data.lengthSeconds || 0,
      source: 'invidious',
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();

    if (!videoId || typeof videoId !== 'string') {
      return new Response(JSON.stringify({ error: 'videoId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanId = videoId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleanId.length < 5 || cleanId.length > 20) {
      return new Response(JSON.stringify({ error: 'Invalid videoId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try Piped instances first (best audio quality)
    const pipedInstances = shuffle(PIPED_INSTANCES);
    for (const instance of pipedInstances) {
      const result = await tryPiped(cleanId, instance);
      if (result) {
        console.log(`Stream found via Piped: ${instance}`);
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback to Invidious
    const invInstances = shuffle(INVIDIOUS_INSTANCES);
    for (const instance of invInstances) {
      const result = await tryInvidious(cleanId, instance);
      if (result) {
        console.log(`Stream found via Invidious: ${instance}`);
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Could not extract audio stream. All providers are currently unavailable.',
    }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('youtube-stream error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
