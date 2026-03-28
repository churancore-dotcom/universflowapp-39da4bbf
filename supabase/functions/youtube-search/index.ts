import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 20 } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'YouTube API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const limit = Math.min(Math.max(1, maxResults), 50);
    const params = new URLSearchParams({
      part: 'snippet',
      q: query.trim(),
      type: 'video',
      videoCategoryId: '10', // Music category
      maxResults: String(limit),
      key: apiKey,
    });

    const ytResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!ytResponse.ok) {
      const errBody = await ytResponse.text();
      console.error('YouTube API error:', ytResponse.status, errBody);
      return new Response(JSON.stringify({
        error: `YouTube API error: ${ytResponse.status}`,
        details: errBody,
      }), {
        status: ytResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ytData = await ytResponse.json();

    const results = (ytData.items || []).map((item: any) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || '',
      channelTitle: item.snippet?.channelTitle || '',
      thumbnail: item.snippet?.thumbnails?.high?.url
        || item.snippet?.thumbnails?.medium?.url
        || item.snippet?.thumbnails?.default?.url || '',
      publishedAt: item.snippet?.publishedAt || '',
    })).filter((r: any) => r.videoId);

    return new Response(JSON.stringify({
      success: true,
      results,
      totalResults: ytData.pageInfo?.totalResults || results.length,
      query: query.trim(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('youtube-search error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
