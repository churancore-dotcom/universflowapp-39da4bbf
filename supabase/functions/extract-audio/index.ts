import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback Piped instances - will be updated dynamically
const FALLBACK_PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.darkness.services',
  'https://pipedapi.syncpundit.io',
  'https://api.piped.yt',
  'https://pipedapi.adminforge.de',
];

interface PipedInstance {
  name: string;
  api_url: string;
  uptime_24h?: number;
  uptime_7d?: number;
  up_to_date?: boolean;
}

interface PipedStreamResponse {
  title: string;
  uploader: string;
  uploaderId: string;
  duration: number;
  thumbnailUrl: string;
  audioStreams?: Array<{
    url: string;
    bitrate: number;
    mimeType: string;
    quality: string;
    format: string;
  }>;
  error?: string;
  message?: string;
}

interface ExtractionResult {
  success: boolean;
  audioUrl?: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  duration?: number;
  platform?: string;
  error?: string;
  hint?: string;
}

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  const cleanUrl = url.trim();
  
  try {
    const urlObj = new URL(cleanUrl);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && vParam.length === 11) {
      return vParam;
    }
  } catch {
    // Not a valid URL
  }

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

function isPlaylistUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hasPlaylist = urlObj.searchParams.has('list');
    const hasVideo = urlObj.searchParams.has('v');
    return hasPlaylist && !hasVideo && url.includes('playlist');
  } catch {
    return false;
  }
}

// Fetch active Piped instances dynamically
async function fetchPipedInstances(): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://piped-instances.kavin.rocks/', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('Failed to fetch Piped instances, using fallbacks');
      return FALLBACK_PIPED_INSTANCES;
    }
    
    const instances: PipedInstance[] = await response.json();
    
    // Filter for instances with good uptime and sort by uptime
    const goodInstances = instances
      .filter(i => i.api_url && (i.uptime_24h === undefined || i.uptime_24h > 90))
      .sort((a, b) => (b.uptime_24h || 0) - (a.uptime_24h || 0))
      .slice(0, 10)
      .map(i => i.api_url);
    
    console.log(`Fetched ${goodInstances.length} Piped instances`);
    return goodInstances.length > 0 ? goodInstances : FALLBACK_PIPED_INSTANCES;
    
  } catch (error) {
    console.log('Error fetching Piped instances:', error);
    return FALLBACK_PIPED_INSTANCES;
  }
}

// Try a single Piped instance
async function tryPipedInstance(apiUrl: string, videoId: string): Promise<ExtractionResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `${apiUrl}/streams/${videoId}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`  ✗ ${new URL(apiUrl).hostname}: HTTP ${response.status}`);
      return null;
    }

    const data: PipedStreamResponse = await response.json();
    
    if (data.error || data.message) {
      console.log(`  ✗ ${new URL(apiUrl).hostname}: ${data.error || data.message}`);
      return null;
    }

    if (!data.audioStreams || data.audioStreams.length === 0) {
      console.log(`  ✗ ${new URL(apiUrl).hostname}: No audio streams`);
      return null;
    }

    // Sort audio streams by bitrate (highest first), prefer m4a
    const sortedStreams = [...data.audioStreams].sort((a, b) => {
      const aIsM4a = a.mimeType?.includes('mp4') || a.format === 'm4a';
      const bIsM4a = b.mimeType?.includes('mp4') || b.format === 'm4a';
      if (aIsM4a && !bIsM4a) return -1;
      if (!aIsM4a && bIsM4a) return 1;
      return (b.bitrate || 0) - (a.bitrate || 0);
    });

    const bestStream = sortedStreams[0];
    console.log(`  ✓ ${new URL(apiUrl).hostname}: ${bestStream.quality} ${Math.round(bestStream.bitrate / 1000)}kbps`);

    return {
      success: true,
      audioUrl: bestStream.url,
      title: data.title,
      artist: data.uploader,
      thumbnail: data.thumbnailUrl,
      duration: data.duration,
      platform: 'YouTube',
    };

  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const err = error as Error;
    const msg = err.name === 'AbortError' ? 'Timeout' : (err.message?.substring(0, 40) || 'Error');
    console.log(`  ✗ ${new URL(apiUrl).hostname}: ${msg}`);
    return null;
  }
}

// Main extraction function
async function extractFromYouTube(videoId: string): Promise<ExtractionResult> {
  console.log(`\n=== Extracting YouTube video: ${videoId} ===`);
  
  // Fetch working instances
  const instances = await fetchPipedInstances();
  console.log(`Testing ${instances.length} Piped instances...`);
  
  // Shuffle to distribute load
  const shuffled = [...instances].sort(() => Math.random() - 0.5);

  // Try instances in parallel batches of 3
  for (let i = 0; i < shuffled.length; i += 3) {
    const batch = shuffled.slice(i, i + 3);
    console.log(`\nBatch ${Math.floor(i/3) + 1}:`);
    
    const results = await Promise.all(
      batch.map(instance => tryPipedInstance(instance, videoId))
    );

    const success = results.find(r => r?.success);
    if (success) {
      return success;
    }
  }

  return {
    success: false,
    error: 'Could not extract audio. All servers are busy or the video is unavailable.',
    hint: 'Try again in a moment. Some videos may be geo-restricted or age-gated.',
    platform: 'YouTube',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('\n========================================');
    console.log('Extracting from URL:', url);

    // Direct audio URL
    if (url.match(/\.(mp3|wav|flac|aac|ogg|m4a|opus|webm)(\?.*)?$/i)) {
      console.log('Direct audio URL detected');
      return new Response(
        JSON.stringify({
          success: true,
          audioUrl: url,
          platform: 'Direct Link',
          title: url.split('/').pop()?.split('?')[0] || 'audio',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Playlist URL check
    if (isPlaylistUrl(url)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Playlist URLs are not supported. Please copy a specific video link.',
          hint: 'Click on a video in the playlist, then copy its URL.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Platform detection
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('music.youtube.com');

    if (!isYouTube) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Currently only YouTube URLs are supported.',
          hint: 'Paste a YouTube video URL (youtube.com/watch?v=... or youtu.be/...)',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    console.log('Video ID:', videoId);

    if (!videoId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Could not extract video ID from URL.',
          hint: 'Please use a direct video URL like youtube.com/watch?v=VIDEO_ID',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract audio
    const result = await extractFromYouTube(videoId);

    if (!result.success) {
      return new Response(
        JSON.stringify(result),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('\n========================================');
    console.log('✓ EXTRACTION SUCCESSFUL');
    console.log('Title:', result.title);
    console.log('Artist:', result.artist);
    console.log('Duration:', result.duration, 'seconds');
    console.log('========================================\n');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Edge function error:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ 
        success: false,
        error: err.message || 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
