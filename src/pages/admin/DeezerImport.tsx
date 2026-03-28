import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Music, Download, Loader2, TrendingUp, Play, Pause, CheckCircle2, AlertCircle, Sparkles, Youtube, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface YouTubeResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

type ImportStatus = 'idle' | 'extracting' | 'importing' | 'done' | 'error';

interface TrackImportState {
  status: ImportStatus;
  error?: string;
}

const QUICK_SEARCHES = [
  { label: '🇮🇳 Bollywood Hits', query: 'bollywood hits 2024 official audio' },
  { label: '🎵 Punjabi Viral', query: 'punjabi viral songs official audio' },
  { label: '🔥 Phonk', query: 'phonk viral music' },
  { label: '🎤 Hip Hop', query: 'hip hop trending 2024 official' },
  { label: '🌍 English Pop', query: 'english pop hits 2024 official audio' },
  { label: '🎸 Funk', query: 'funk music best' },
  { label: '💜 Haryanvi', query: 'haryanvi songs trending official' },
  { label: '🎧 Lo-Fi', query: 'lofi chill beats' },
  { label: '⚡ EDM', query: 'edm dance hits official' },
  { label: '🎶 Arijit Singh', query: 'Arijit Singh official audio' },
  { label: '🔊 AP Dhillon', query: 'AP Dhillon official audio' },
  { label: '🌟 Diljit Dosanjh', query: 'Diljit Dosanjh official audio' },
  { label: '🎵 BTS', query: 'BTS official audio' },
  { label: '🔥 Travis Scott', query: 'Travis Scott official audio' },
  { label: '💎 Drake', query: 'Drake official audio' },
  { label: '🎤 Eminem', query: 'Eminem official audio' },
];

function cleanTitle(raw: string): { title: string; artist: string } {
  let s = raw
    .replace(/\s*\(official\s*(video|audio|music\s*video|lyric\s*video|visualizer|mv)\)\s*/gi, '')
    .replace(/\s*\[official\s*(video|audio|music\s*video|lyric\s*video|visualizer|mv)\]\s*/gi, '')
    .replace(/\s*\|\s*official\s*(video|audio|music\s*video).*/gi, '')
    .replace(/\s*official\s*(video|audio|music\s*video|lyric\s*video)\s*/gi, '')
    .replace(/\s*\(lyrics?\)\s*/gi, '')
    .replace(/\s*\[lyrics?\]\s*/gi, '')
    .replace(/\s*\(audio\)\s*/gi, '')
    .replace(/\s*\[audio\]\s*/gi, '')
    .replace(/\s*\(visualizer\)\s*/gi, '')
    .replace(/\s*ft\.?\s*/gi, ' ft. ')
    .replace(/\s+/g, ' ')
    .trim();

  // Try to split "Artist - Title"
  const dashMatch = s.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return { artist: dashMatch[1].trim(), title: dashMatch[2].trim() };
  }
  return { title: s, artist: '' };
}

function guessGenre(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('bollywood') || q.includes('hindi')) return 'Bollywood';
  if (q.includes('punjabi')) return 'Punjabi';
  if (q.includes('haryanvi')) return 'Haryanvi';
  if (q.includes('phonk')) return 'Phonk';
  if (q.includes('hip hop') || q.includes('hiphop') || q.includes('rap')) return 'Hip Hop';
  if (q.includes('funk')) return 'Funk';
  if (q.includes('edm') || q.includes('electronic')) return 'Electronic';
  if (q.includes('lofi') || q.includes('lo-fi')) return 'Lo-Fi';
  if (q.includes('pop')) return 'Pop';
  if (q.includes('rock')) return 'Rock';
  if (q.includes('r&b') || q.includes('rnb')) return 'R&B';
  if (q.includes('jazz')) return 'Jazz';
  if (q.includes('classical')) return 'Classical';
  if (q.includes('metal')) return 'Metal';
  if (q.includes('indie')) return 'Indie';
  return 'Pop';
}

const DeezerImport = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importStates, setImportStates] = useState<Record<string, TrackImportState>>({});
  const [lastQuery, setLastQuery] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const searchYouTube = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('youtube-search', {
        body: { query: searchQuery, maxResults: 25 },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Search failed');

      setResults(data.results || []);
      setLastQuery(searchQuery);
      toast.success(`Found ${data.results?.length || 0} results`);
    } catch (err: any) {
      toast.error('Search failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  const importTrack = useCallback(async (result: YouTubeResult): Promise<boolean> => {
    setImportStates(prev => ({ ...prev, [result.videoId]: { status: 'extracting' } }));

    try {
      // Step 1: Extract audio stream via Piped/Invidious
      const { data: streamData, error: streamError } = await supabase.functions.invoke('youtube-stream', {
        body: { videoId: result.videoId },
      });

      if (streamError || !streamData?.success) {
        throw new Error(streamData?.error || streamError?.message || 'Audio extraction failed');
      }

      setImportStates(prev => ({ ...prev, [result.videoId]: { status: 'importing' } }));

      // Step 2: Parse title/artist
      const cleaned = cleanTitle(result.title);
      const finalTitle = streamData.title
        ? cleanTitle(streamData.title).title || cleaned.title
        : cleaned.title;
      const finalArtist = streamData.artist
        || cleaned.artist
        || result.channelTitle.replace(/ - Topic$/, '');

      // Step 3: Check for duplicates
      const { data: existing } = await supabase
        .from('songs')
        .select('id')
        .ilike('title', finalTitle)
        .ilike('artist', finalArtist)
        .limit(1);

      if (existing && existing.length > 0) {
        setImportStates(prev => ({ ...prev, [result.videoId]: { status: 'done' } }));
        toast.info(`"${finalTitle}" already exists`);
        return true;
      }

      // Step 4: Insert into database
      const { error: insertError } = await supabase.from('songs').insert({
        title: finalTitle,
        artist: finalArtist,
        audio_url: streamData.audioUrl,
        cover_url: streamData.thumbnail || result.thumbnail || null,
        duration: streamData.duration || 0,
        genre: guessGenre(lastQuery),
        is_visible: true,
        show_in_new_releases: true,
      });

      if (insertError) throw insertError;

      setImportStates(prev => ({ ...prev, [result.videoId]: { status: 'done' } }));
      toast.success(`✅ Imported "${finalTitle}" by ${finalArtist}`);
      return true;

    } catch (err: any) {
      console.error('Import error:', err);
      setImportStates(prev => ({
        ...prev,
        [result.videoId]: { status: 'error', error: err.message || 'Import failed' },
      }));
      toast.error(`Failed: ${result.title} — ${err.message}`);
      return false;
    }
  }, [lastQuery]);

  const importAll = useCallback(async () => {
    const unimported = results.filter(r => {
      const state = importStates[r.videoId];
      return !state || state.status === 'idle' || state.status === 'error';
    });

    if (unimported.length === 0) {
      toast.info('All tracks already imported');
      return;
    }

    setBulkImporting(true);
    let success = 0;
    let failed = 0;

    for (const result of unimported) {
      const ok = await importTrack(result);
      if (ok) success++;
      else failed++;
      await new Promise(r => setTimeout(r, 2000));
    }

    setBulkImporting(false);
    toast.success(`Done: ${success} imported, ${failed} failed`);
  }, [results, importStates, importTrack]);

  const handlePreview = useCallback(async (result: YouTubeResult) => {
    if (playingId === result.videoId) {
      previewAudio?.pause();
      setPlayingId(null);
      return;
    }

    previewAudio?.pause();

    try {
      const { data } = await supabase.functions.invoke('youtube-stream', {
        body: { videoId: result.videoId },
      });

      if (data?.success && data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.play();
        setPreviewAudio(audio);
        setPlayingId(result.videoId);
        audio.addEventListener('ended', () => setPlayingId(null));
        setTimeout(() => { audio.pause(); setPlayingId(null); }, 30000);
      }
    } catch {
      toast.error('Preview not available');
    }
  }, [playingId, previewAudio]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchYouTube(query);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
            <Youtube className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">YouTube Import</h1>
            <p className="text-sm text-muted-foreground">Search any song via YouTube API → Import full audio stream</p>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search any song, artist, genre... (Phonk, Arijit Singh, etc.)"
            className="pl-10 bg-card border-border"
          />
        </div>
        <Button type="submit" disabled={loading || !query.trim()} className="bg-red-600 hover:bg-red-700">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {/* Quick Search Chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_SEARCHES.map(qs => (
          <Button
            key={qs.query}
            variant="outline"
            size="sm"
            onClick={() => { setQuery(qs.query); searchYouTube(qs.query); }}
            disabled={loading}
            className="text-xs"
          >
            {qs.label}
          </Button>
        ))}
      </div>

      {/* Results Header */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{lastQuery}</span>
            {' · '}{results.length} results
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => searchYouTube(lastQuery)}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
            <Button
              onClick={importAll}
              disabled={bulkImporting || loading}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {bulkImporting ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Importing...</>
              ) : (
                <><Download className="w-3 h-3 mr-1" /> Import All</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-2">
        <AnimatePresence>
          {results.map((result, i) => {
            const state = importStates[result.videoId] || { status: 'idle' };
            const isPlaying = playingId === result.videoId;
            return (
              <motion.div
                key={result.videoId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
              >
                {/* Thumbnail */}
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {result.thumbnail ? (
                    <img src={result.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => handlePreview(result)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" fill="white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" fill="white" />
                    )}
                  </button>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{result.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{result.channelTitle}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Youtube className="w-3 h-3 text-red-500" />
                    <span className="text-[10px] text-red-400">YouTube</span>
                  </div>
                </div>

                {/* Import Button */}
                <div className="flex-shrink-0">
                  {state.status === 'idle' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => importTrack(result)}
                      className="text-primary hover:bg-primary/10"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  {(state.status === 'extracting' || state.status === 'importing') && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{state.status === 'extracting' ? 'Extracting...' : 'Saving...'}</span>
                    </div>
                  )}
                  {state.status === 'done' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {state.status === 'error' && (
                    <button onClick={() => importTrack(result)} title={state.error}>
                      <AlertCircle className="w-5 h-5 text-destructive hover:text-destructive/80" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {!loading && results.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 space-y-3"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Youtube className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">YouTube Music Import</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Search for any song using YouTube's API. Phonk, Funk, Bollywood, Hip Hop — everything is available. Click import to extract the full audio stream.
          </p>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <p className="text-sm text-muted-foreground">Searching YouTube...</p>
        </div>
      )}
    </div>
  );
};

export default DeezerImport;
