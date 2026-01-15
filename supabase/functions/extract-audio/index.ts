import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// List of public cobalt API instances (community-maintained)
const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt-api.hyper.lol',
  'https://co.eepy.today',
];

interface CobaltResponse {
  status: 'tunnel' | 'redirect' | 'picker' | 'error' | 'local-processing';
  url?: string;
  filename?: string;
  error?: string;
  picker?: Array<{ url: string; type: string }>;
  audio?: { url: string };
}

async function tryExtractWithInstance(instanceUrl: string, mediaUrl: string): Promise<CobaltResponse | null> {
  try {
    console.log(`Trying cobalt instance: ${instanceUrl}`);
    
    const response = await fetch(instanceUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'UniversFlow/1.0 (+https://universflowapp.lovable.app)',
      },
      body: JSON.stringify({
        url: mediaUrl,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioBitrate: '320',
      }),
    });

    if (!response.ok) {
      console.log(`Instance ${instanceUrl} returned status ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`Instance ${instanceUrl} response:`, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error(`Error with instance ${instanceUrl}:`, error);
    return null;
  }
}

function detectPlatform(url: string): string {
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) return 'YouTube';
  if (lowercaseUrl.includes('soundcloud.com')) return 'SoundCloud';
  if (lowercaseUrl.includes('spotify.com')) return 'Spotify';
  if (lowercaseUrl.includes('tiktok.com')) return 'TikTok';
  if (lowercaseUrl.includes('twitter.com') || lowercaseUrl.includes('x.com')) return 'Twitter/X';
  if (lowercaseUrl.includes('instagram.com')) return 'Instagram';
  if (lowercaseUrl.includes('facebook.com') || lowercaseUrl.includes('fb.watch')) return 'Facebook';
  if (lowercaseUrl.includes('vimeo.com')) return 'Vimeo';
  if (lowercaseUrl.includes('twitch.tv')) return 'Twitch';
  if (lowercaseUrl.includes('reddit.com')) return 'Reddit';
  if (lowercaseUrl.includes('bilibili.com')) return 'Bilibili';
  return 'Unknown';
}

serve(async (req) => {
  // Handle CORS preflight
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

    console.log(`Extracting audio from: ${url}`);
    const platform = detectPlatform(url);
    console.log(`Detected platform: ${platform}`);

    // Check if it's a direct audio URL
    if (url.match(/\.(mp3|wav|flac|aac|ogg|m4a|opus)(\?.*)?$/i)) {
      console.log('Direct audio URL detected, returning as-is');
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

    // Try each cobalt instance until one works
    let result: CobaltResponse | null = null;
    
    for (const instance of COBALT_INSTANCES) {
      result = await tryExtractWithInstance(instance, url);
      if (result && result.status !== 'error') {
        break;
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to extract audio. All extraction servers are unavailable.',
          platform,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.status === 'error') {
      return new Response(
        JSON.stringify({ 
          error: result.error || 'Failed to extract audio from this URL',
          platform,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different response types
    let audioUrl: string | null = null;
    let filename = result.filename || 'audio.mp3';

    if (result.status === 'tunnel' || result.status === 'redirect') {
      audioUrl = result.url || null;
    } else if (result.status === 'picker' && result.picker) {
      // Find the first audio item or use the first item
      const audioItem = result.picker.find(item => item.type === 'audio') || result.picker[0];
      audioUrl = audioItem?.url || null;
    } else if (result.audio?.url) {
      audioUrl = result.audio.url;
    }

    if (!audioUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not find audio URL in response',
          platform,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully extracted audio: ${audioUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl,
        platform,
        filename,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in extract-audio function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
