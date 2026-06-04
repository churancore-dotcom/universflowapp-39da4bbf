import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer, type Song } from '@/contexts/PlayerContext';
import { Sparkles, X, Loader2, Radio, Music2, Play } from 'lucide-react';
import { iosSpring } from '@/lib/animations';
import { toast } from 'sonner';
import { usePremium } from '@/hooks/usePremium';
import PremiumLockOverlay from './PremiumLockOverlay';
import { runPlaylistEngine, type CandidateSong, type HistoryEntry, type UserSongScore } from '@/lib/playlistEngine';

interface AIPlaylistGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  /** Kept for backwards compat with Library.tsx (no DB rows are created anymore). */
  onPlaylistCreated?: () => void;
}

interface SeedRow {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  genre: string | null;
  mood: string | null;
  audio_url: string;
  duration: number | null;
  album: string | null;
}

const tagsFor = (s: { genre?: string | null; mood?: string | null; artist?: string | null }) =>
  [s.genre, s.mood, s.artist].filter(Boolean).map((t) => String(t).toLowerCase().trim());

/**
 * Auto Generate — picks a seed, saves a real playlist to the user's library,
 * and starts playback immediately from the generated queue.
 */
const AIPlaylistGenerator = memo(({ isOpen, onClose, onPlaylistCreated }: AIPlaylistGeneratorProps) => {
  const { user } = useAuth();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const { playSong } = usePlayer();
  const [seeds, setSeeds] = useState<SeedRow[]>([]);
  const [seedId, setSeedId] = useState<string | null>(null);
  const [loadingSeeds, setLoadingSeeds] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Load seed candidates from recent plays, fall back to top catalog
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    setLoadingSeeds(true);
    (async () => {
      const { data: rp } = await supabase
        .from('recently_played')
        .select('song_id, played_at, songs(id,title,artist,cover_url,genre,mood,audio_url,duration,album)')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(40);
      const seen = new Set<string>();
      const list: SeedRow[] = [];
      (rp || []).forEach((row: any) => {
        const s = row.songs;
        if (!s || seen.has(s.id)) return;
        seen.add(s.id);
        list.push({
          id: s.id, title: s.title, artist: s.artist, cover_url: s.cover_url,
          genre: s.genre, mood: s.mood, audio_url: s.audio_url,
          duration: s.duration, album: s.album,
        });
      });

      // Fallback: pull popular catalog so Auto Generate is ALWAYS usable, even
      // for brand-new users who haven't played anything yet.
      if (list.length === 0) {
        const { data: top } = await supabase
          .from('songs')
          .select('id,title,artist,cover_url,genre,mood,audio_url,duration,album,play_count')
          .eq('is_visible', true)
          .order('play_count', { ascending: false, nullsFirst: false })
          .limit(20);
        (top || []).forEach((s: any) => {
          if (seen.has(s.id)) return;
          seen.add(s.id);
          list.push({
            id: s.id, title: s.title, artist: s.artist, cover_url: s.cover_url,
            genre: s.genre, mood: s.mood, audio_url: s.audio_url,
            duration: s.duration, album: s.album,
          });
        });
      }

      if (!cancelled) {
        setSeeds(list);
        setSeedId(list[0]?.id ?? null);
        setLoadingSeeds(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, user]);

  if (isOpen && !premiumLoading && !isPremium) {
    return (
      <AnimatePresence>
        <PremiumLockOverlay
          title="Auto Generate"
          description="Pick a song and we'll create a saved playlist tuned to your taste. Available with Premium."
          onClose={onClose}
        />
      </AnimatePresence>
    );
  }

  const startMix = async () => {
    if (!user || !seedId) {
      toast.error('Pick a song to start the mix');
      return;
    }
    setIsStarting(true);
    try {
      const seed = seeds.find((s) => s.id === seedId)!;

      const { data: catalog } = await supabase
        .from('songs')
        .select('id,title,artist,album,cover_url,genre,mood,duration,audio_url,play_count')
        .eq('is_visible', true)
        .limit(1000);
      if (!catalog || catalog.length === 0) {
        toast.error('Catalog is empty');
        return;
      }

      const all_songs: CandidateSong[] = catalog.map((s) => ({
        id: s.id,
        tags: tagsFor(s),
        genre: s.genre,
        play_count_7d: s.play_count ?? 0,
      }));

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: hist } = await supabase
        .from('recently_played')
        .select('song_id, played_at')
        .eq('user_id', user.id)
        .gte('played_at', since)
        .limit(500);
      const user_history: HistoryEntry[] = (hist || []).map((h: any) => ({
        song_id: h.song_id,
        timestamp: new Date(h.played_at).getTime(),
      }));

      const { data: lib } = await supabase
        .from('user_library')
        .select('song_id, track_source')
        .eq('user_id', user.id)
        .limit(500);
      const user_song_scores: UserSongScore[] = (lib || [])
        .filter((r: any) => r.track_source === 'library' || !r.track_source)
        .map((r: any) => ({ user_id: user.id, song_id: r.song_id, score: 1.0 }));

      const { playlist } = runPlaylistEngine({
        seed_song: { id: seed.id, tags: tagsFor(seed), genre: seed.genre },
        user_history,
        session_played: [],
        all_songs,
        user_song_scores,
      });

      const byId = new Map(catalog.map((s) => [s.id, s]));
      const seedRow = byId.get(seed.id);
      const picked: any[] = [
        ...(seedRow ? [seedRow] : []),
        ...playlist.map((p) => byId.get(p.song_id)).filter(Boolean),
      ];
      const usedIds = new Set(picked.map((s) => s.id));

      // Fallback 1: same genre / same artist, ordered by popularity
      const seedGenre = (seed.genre || '').toLowerCase().trim();
      const seedArtist = (seed.artist || '').toLowerCase().trim();
      if (picked.length < 20) {
        const related = [...catalog]
          .filter((s) => !usedIds.has(s.id))
          .filter((s) =>
            (seedGenre && (s.genre || '').toLowerCase().trim() === seedGenre) ||
            (seedArtist && (s.artist || '').toLowerCase().trim() === seedArtist)
          )
          .sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
        for (const s of related) {
          if (picked.length >= 20) break;
          picked.push(s);
          usedIds.add(s.id);
        }
      }

      // Fallback 2: popular catalog — guarantees mix always plays
      if (picked.length < 20) {
        const popular = [...catalog]
          .filter((s) => !usedIds.has(s.id))
          .sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
        for (const s of popular) {
          if (picked.length >= 20) break;
          picked.push(s);
          usedIds.add(s.id);
        }
      }

      if (picked.length === 0) {
        toast.error('Catalog is empty');
        return;
      }

      const queue: Song[] = picked.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album ?? undefined,
        cover_url: s.cover_url ?? undefined,
        audio_url: s.audio_url,
        duration: s.duration ?? 0,
        genre: s.genre ?? undefined,
        mood: s.mood ?? undefined,
      }) as Song);

      const { data: playlistRow, error: playlistError } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          title: `Mix: ${seed.title}`,
          description: `Auto-generated from ${seed.title} by ${seed.artist}`,
          cover_url: queue[0]?.cover_url ?? null,
          is_public: false,
        })
        .select('id')
        .single();

      if (playlistError || !playlistRow?.id) throw playlistError ?? new Error('Playlist was not created');

      const { error: songsError } = await supabase.from('playlist_songs').insert(
        queue.map((song, position) => ({
          playlist_id: playlistRow.id,
          song_id: song.id,
          position,
          track_source: song.source ?? 'library',
        })),
      );

      if (songsError) throw songsError;

      onPlaylistCreated?.();
      playSong(queue[0], null, queue);
      toast.success(`Playlist created · ${queue.length} tracks`);
      onClose();
    } catch (e) {
      console.error('Playlist generation failed:', e);
      toast.error('Could not create playlist. Try again.');
    } finally {
      setIsStarting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-md rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(30,30,35,0.98) 0%, rgba(20,20,25,0.99) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={iosSpring}
        >
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-rose-500 to-violet-500">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Auto Generate</h2>
                <p className="text-xs text-muted-foreground">Pick a song · save 20 tuned tracks</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 rounded-full flex items-center justify-center glass"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Seed song</h3>
              {loadingSeeds ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading your recent plays…
                </div>
              ) : seeds.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Play a few catalog songs first, then come back to start a mix.
                </div>
              ) : (
                <div className="space-y-2">
                  {seeds.slice(0, 12).map((s) => {
                    const active = s.id === seedId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSeedId(s.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left ${
                          active ? 'bg-gradient-to-r from-rose-500/25 to-violet-500/15 ring-1 ring-rose-500/40' : 'glass hover:bg-white/10'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                          {s.cover_url ? (
                            <img src={s.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Music2 className="w-4 h-4 opacity-50" /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.artist}</p>
                        </div>
                        {active && <Sparkles className="w-4 h-4 text-rose-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={startMix}
              disabled={isStarting || !seedId}
              className="w-full py-4 rounded-2xl font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-3 bg-gradient-to-r from-rose-500 to-violet-500"
            >
              {isStarting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /><span>Building mix…</span></>
              ) : (
                <><Play className="w-5 h-5" fill="currentColor" /><span>Create Playlist</span></>
              )}
            </button>
            <p className="text-[11px] text-muted-foreground text-center -mt-2">
              Saves to your library · starts playing instantly
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

AIPlaylistGenerator.displayName = 'AIPlaylistGenerator';
export default AIPlaylistGenerator;
