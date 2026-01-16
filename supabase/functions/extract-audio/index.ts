import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PipedInstance {
  name: string;
  api_url: string;
  uptime_24h?: number;
  uptime_7d?: number;
}

interface PipedAudioStream {
  url: string;
  bitrate: number;
  mimeType: string;
  quality: string;
  format: string;
}

interface PipedResponse {
  audioStreams?: PipedAudioStream[];
  title?: string;
  uploader?: string;
  duration?: number;
  error?: string;
  message?: string;
}

// Fallback instances if dynamic fetch fails
const FALLBACK_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.moomoo.me',
  'https://api-piped.mha.fi',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.rivo.lol',
  'https://piapi.ggtyler.dev',
];

function extractVideoId(url: string): string | null {
  // Try URL parsing first for query parameters
  try {
    const urlObj = new URL(url);
    
    // Check for ?v= parameter (most common)
    const vParam = urlObj.searchParams.get('v');
    if (vParam && vParam.length === 11) return vParam;
    
    // Check for playlist with currently playing video
    // URLs like: youtube.com/watch?v=XXX&list=YYY
    // But NOT: youtube.com/playlist?list=YYY (no video playing)
    
  } catch {
    // Not a valid URL, try regex patterns
  }
  
  const patterns = [
    // Standard watch URLs
    /(?:youtube\.com|music\.youtube\.com)\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    // Short URLs
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // Embed and other formats
    /youtube\.com\/(?:embed|v|shorts|live)\/([a-zA-Z0-9_-]{11})/,
    // Direct video ID
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isPlaylistUrl(url: string): boolean {
  return url.includes('playlist?list=') || (url.includes('list=') && !url.includes('v='));
}

// Fetch instances dynamically from official API
async function fetchPipedInstances(): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://piped-instances.kavin.rocks/', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('Failed to fetch instances list, using fallback');
      return FALLBACK_INSTANCES;
    }
    
    const instances: PipedInstance[] = await response.json();
    
    // Sort by uptime and take top instances
    const sortedInstances = instances
      .filter(i => i.api_url && i.uptime_24h && i.uptime_24h > 90)
      .sort((a, b) => (b.uptime_24h || 0) - (a.uptime_24h || 0))
      .slice(0, 10)
      .map(i => i.api_url);
    
    if (sortedInstances.length === 0) {
      console.log('No good instances found, using fallback');
      return FALLBACK_INSTANCES;
    }
    
    console.log(`Found ${sortedInstances.length} working Piped instances`);
    return sortedInstances;
  } catch (error) {
    console.log('Error fetching instances:', error);
    return FALLBACK_INSTANCES;
  }
}

async function tryPipedInstance(
  instanceUrl: string, 
  videoId: string,
  timeoutMs: number = 8000
): Promise<{ success: boolean; audioUrl?: string; title?: string; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    console.log(`Trying: ${instanceUrl}`);
    
    const response = await fetch(`${instanceUrl}/streams/${videoId}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data: PipedResponse = await response.json();
    
    if (data.error || data.message) {
      return { success: false, error: data.error || data.message };
    }

    if (!data.audioStreams || data.audioStreams.length === 0) {
      return { success: false, error: 'No audio streams' };
    }

    // Find best audio stream (prefer M4A/MP4 format, higher bitrate)
    const sortedStreams = [...data.audioStreams].sort((a, b) => {
      const aIsM4a = a.mimeType?.includes('mp4') || a.format?.includes('M4A');
      const bIsM4a = b.mimeType?.includes('mp4') || b.format?.includes('M4A');
      if (aIsM4a && !bIsM4a) return -1;
      if (!aIsM4a && bIsM4a) return 1;
      return (b.bitrate || 0) - (a.bitrate || 0);
    });

    const bestStream = sortedStreams[0];
    console.log(`✓ Found: ${bestStream.quality}, ${bestStream.mimeType}`);

    return {
      success: true,
      audioUrl: bestStream.url,
      title: data.title,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : 'Network error';
    if (msg.includes('abort')) {
      return { success: false, error: 'Timeout' };
    }
    return { success: false, error: msg };
  }
}

// Race multiple instances in parallel for faster results
async function extractFromYouTube(videoId: string): Promise<{
  success: boolean;
  audioUrl?: string;
  title?: string;
  error?: string;
}> {
  const instances = await fetchPipedInstances();
  console.log(`Trying ${instances.length} Piped instances in parallel batches...`);
  
  // Try in batches of 3 for efficiency
  const batchSize = 3;
  
  for (let i = 0; i < instances.length; i += batchSize) {
    const batch = instances.slice(i, i + batchSize);
    console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${batch.map(u => new URL(u).hostname).join(', ')}`);
    
    const results = await Promise.all(
      batch.map(instance => tryPipedInstance(instance, videoId))
    );
    
    // Return first successful result
    const success = results.find(r => r.success);
    if (success) {
      return success;
    }
    
    // Log errors for debugging
    results.forEach((r, idx) => {
      if (!r.success) {
        console.log(`  ✗ ${new URL(batch[idx]).hostname}: ${r.error}`);
      }
    });
  }
  
  return { 
    success: false, 
    error: 'All extraction servers failed or are rate-limited' 
  };
}

function detectPlatform(url: string): string {
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) return 'YouTube';
  if (lowercaseUrl.includes('soundcloud.com')) return 'SoundCloud';
  if (lowercaseUrl.includes('spotify.com')) return 'Spotify';
  if (lowercaseUrl.includes('tiktok.com')) return 'TikTok';
  if (lowercaseUrl.includes('twitter.com') || lowercaseUrl.includes('x.com')) return 'Twitter/X';
  if (lowercaseUrl.includes('instagram.com')) return 'Instagram';
  return 'Other';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`\n=== Extracting audio from: ${url} ===`);
    const platform = detectPlatform(url);
    console.log(`Platform: ${platform}`);

    // Direct audio URL - return as-is
    if (url.match(/\.(mp3|wav|flac|aac|ogg|m4a|opus|webm)(\?.*)?$/i)) {
      console.log('Direct audio URL detected');
      return new Response(
        JSON.stringify({
          success: true,
          audioUrl: url,
          platform: 'Direct Link',
          filename: url.split('/').pop()?.split('?')[0] || 'audio.mp3',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // YouTube extraction
    if (platform === 'YouTube') {
      // Check if it's a playlist URL without a specific video
      if (isPlaylistUrl(url)) {
        return new Response(
          JSON.stringify({ 
            error: 'Playlist URLs are not supported. Please copy the link of a specific video instead.',
            platform: 'YouTube',
            hint: 'Click on a video in the playlist, then copy its URL from the browser address bar.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const videoId = extractVideoId(url);
      
      if (!videoId) {
        return new Response(
          JSON.stringify({ 
            error: 'Could not extract video ID. Please use a direct video link.',
            platform: 'YouTube',
            hint: 'Use a URL like youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Video ID: ${videoId}`);

      const result = await extractFromYouTube(videoId);
      
      if (result.success && result.audioUrl) {
        console.log(`✓ Success! Title: ${result.title}`);
        return new Response(
          JSON.stringify({
            success: true,
            audioUrl: result.audioUrl,
            platform: 'YouTube',
            filename: result.title ? `${result.title.replace(/[<>:"/\\|?*]/g, '')}.m4a` : 'audio.m4a',
            title: result.title,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✗ All attempts failed: ${result.error}`);
      return new Response(
        JSON.stringify({ 
          error: 'YouTube extraction temporarily unavailable. Please try again in a moment.',
          platform: 'YouTube',
          hint: 'The extraction servers may be busy. Try again or use a direct audio link.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unsupported platform
    return new Response(
      JSON.stringify({ 
        error: `Audio extraction from ${platform} is not currently supported.`,
        platform,
        hint: 'Please use a YouTube link or direct audio link (MP3, WAV, etc.).',
        supportedPlatforms: ['YouTube', 'Direct Links (MP3, WAV, FLAC, M4A, OGG)'],
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
