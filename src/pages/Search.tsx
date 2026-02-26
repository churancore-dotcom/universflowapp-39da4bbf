import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Music, X, Tag, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import { useDownloads } from '@/contexts/DownloadContext';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import LikeButton from '@/components/LikeButton';
import DownloadButton from '@/components/DownloadButton';
import { TabTransition } from '@/components/PageTransition';
import { Input } from '@/components/ui/input';
import { SearchSkeleton } from '@/components/PageSkeletons';

const genres = [
  { name: 'Pop', color: 'from-pink-500 to-rose-500', icon: '🎤' },
  { name: 'Rock', color: 'from-red-500 to-orange-500', icon: '🎸' },
  { name: 'Hip Hop', color: 'from-yellow-500 to-amber-500', icon: '🎧' },
  { name: 'R&B', color: 'from-purple-500 to-violet-500', icon: '💜' },
  { name: 'Electronic', color: 'from-cyan-500 to-blue-500', icon: '🎹' },
  { name: 'Jazz', color: 'from-amber-600 to-yellow-600', icon: '🎷' },
];

const moods = [
  { name: 'Chill', color: 'from-sky-400 to-cyan-500', icon: '😌' },
  { name: 'Energetic', color: 'from-orange-400 to-red-500', icon: '⚡' },
  { name: 'Romantic', color: 'from-pink-400 to-rose-500', icon: '💕' },
  { name: 'Focus', color: 'from-violet-500 to-purple-600', icon: '🎯' },
];

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{ type: 'genre' | 'mood'; value: string } | null>(null);
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { getDownloadedUrl } = useDownloads();

  useEffect(() => {
    const genre = searchParams.get('genre');
    const mood = searchParams.get('mood');
    
    if (genre) {
      setActiveFilter({ type: 'genre', value: genre });
      searchByGenre(genre);
      setSearchParams({});
    } else if (mood) {
      setActiveFilter({ type: 'mood', value: mood });
      searchByMood(mood);
      setSearchParams({});
    }
  }, [searchParams]);

  useEffect(() => {
    if (query.length > 1) {
      const timer = setTimeout(() => searchSongs(), 300);
      return () => clearTimeout(timer);
    } else if (!activeFilter) {
      setResults([]);
    }
  }, [query]);

  const searchSongs = async () => {
    setSearching(true);
    setActiveFilter(null);
    const { data } = await supabase
      .from('songs')
      .select('*, artists(id, name, photo_url)')
      .eq('is_visible', true)
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`)
      .limit(15);

    if (data) {
      setResults(data.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album || undefined,
        cover_url: s.cover_url || undefined,
        audio_url: s.audio_url,
        artist_id: (s.artists as any)?.id || s.artist_id || undefined,
        artist_photo_url: (s.artists as any)?.photo_url || undefined,
      })));
    }
    setSearching(false);
  };

  const searchByGenre = async (genre: string) => {
    setQuery('');
    setActiveFilter({ type: 'genre', value: genre });
    setSearching(true);
    const { data } = await supabase
      .from('songs')
      .select('*, artists(id, name, photo_url)')
      .eq('is_visible', true)
      .ilike('genre', `%${genre}%`)
      .limit(20);

    if (data) {
      setResults(data.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album || undefined,
        cover_url: s.cover_url || undefined,
        audio_url: s.audio_url,
        artist_id: (s.artists as any)?.id || s.artist_id || undefined,
        artist_photo_url: (s.artists as any)?.photo_url || undefined,
      })));
    }
    setSearching(false);
  };

  const searchByMood = async (mood: string) => {
    setQuery('');
    setActiveFilter({ type: 'mood', value: mood });
    setSearching(true);
    const { data } = await supabase
      .from('songs')
      .select('*, artists(id, name, photo_url)')
      .eq('is_visible', true)
      .ilike('mood', `%${mood}%`)
      .limit(20);

    if (data) {
      setResults(data.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album || undefined,
        cover_url: s.cover_url || undefined,
        audio_url: s.audio_url,
        artist_id: (s.artists as any)?.id || s.artist_id || undefined,
        artist_photo_url: (s.artists as any)?.photo_url || undefined,
      })));
    }
    setSearching(false);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setQuery('');
    setResults([]);
  };

  return (
    <TabTransition>
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden relative">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 50% 0%, hsl(260 100% 60% / 0.05), transparent),
                radial-gradient(ellipse 60% 40% at 80% 20%, hsl(330 100% 65% / 0.04), transparent)
              `,
            }}
          />
        </div>

        {/* Header — glassmorphism */}
        <header
          className="flex-shrink-0 z-30 px-4 pt-3 pb-3 safe-area-pt"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <motion.h1
            className="text-2xl font-bold mb-3 tracking-tight"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            Search
          </motion.h1>
          
          {/* Search bar — glass style */}
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Artists, songs, or albums"
              className="pl-10 pr-8 h-11 text-sm rounded-xl border-0"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: isFocused ? '1px solid hsl(var(--primary) / 0.4)' : '1px solid rgba(255,255,255,0.06)',
                transition: 'border-color 0.2s',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Active Filter */}
          {activeFilter && (
            <motion.div
              className="mt-2.5 flex items-center gap-2"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: activeFilter.type === 'genre'
                    ? 'hsl(var(--primary) / 0.15)'
                    : 'hsl(var(--accent) / 0.15)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {activeFilter.type === 'genre' ? (
                  <Tag className="w-3 h-3 text-primary" />
                ) : (
                  <Sparkles className="w-3 h-3 text-accent" />
                )}
                <span className="font-medium text-xs">{activeFilter.value}</span>
                <button onClick={clearFilter} className="ml-1 p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 relative z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
          <AnimatePresence mode="wait">
            {!query && !activeFilter && (
              <motion.div
                key="browse"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Moods */}
                <h2 className="text-sm font-bold mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Moods
                </h2>
                <div className="flex gap-2.5 overflow-x-auto pb-4 -mx-4 px-4 hide-scrollbar">
                  {moods.map((mood, i) => (
                    <motion.button
                      key={mood.name}
                      className={`flex-shrink-0 w-[85px] h-16 rounded-2xl overflow-hidden relative bg-gradient-to-br ${mood.color}`}
                      onClick={() => searchByMood(mood.name)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.93 }}
                      style={{
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      }}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl mb-0.5">{mood.icon}</span>
                        <span className="text-[10px] font-bold text-primary-foreground">{mood.name}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Genres */}
                <h2 className="text-sm font-bold mb-2.5 mt-1 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-primary" />
                  Genres
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {genres.map((genre, i) => (
                    <motion.button
                      key={genre.name}
                      className={`relative h-20 rounded-2xl overflow-hidden bg-gradient-to-br ${genre.color}`}
                      onClick={() => searchByGenre(genre.name)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 + 0.1 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      }}
                    >
                      <span className="absolute top-2.5 right-2.5 text-xl">{genre.icon}</span>
                      <span className="absolute bottom-2.5 left-3 text-sm font-bold text-primary-foreground">
                        {genre.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          {searching ? (
            <SearchSkeleton />
          ) : results.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-sm font-bold mb-3">{results.length} results</h2>
              <div className="space-y-1">
                {results.map((song, i) => {
                  const isActive = currentSong?.id === song.id;
                  const offlineUrl = getDownloadedUrl(song.id);
                  return (
                    <motion.div
                      key={song.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer active:scale-[0.98] transition-all ${
                        isActive ? 'bg-primary/10' : 'active:bg-white/5'
                      }`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.25 }}
                      onClick={() => playSong(song, offlineUrl, results)}
                    >
                      {/* Album art */}
                      <div className={`relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ${
                        isActive ? 'shadow-lg shadow-primary/20' : 'shadow-md'
                      }`}>
                        {song.cover_url ? (
                          <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <Music className="w-4 h-4 text-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Song info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-[13px] truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          {song.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{song.artist}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isActive && isPlaying ? (
                          <div className="flex items-end gap-[2px] h-4 mr-1">
                            {[0, 1, 2].map((j) => (
                              <div
                                key={j}
                                className="w-[3px] bg-primary rounded-full animate-audio-wave"
                                style={{ animationDelay: `${j * 0.12}s` }}
                              />
                            ))}
                          </div>
                        ) : (
                          <>
                            <LikeButton songId={song.id} size="sm" className="w-8 h-8" />
                            <DownloadButton song={song} size="sm" />
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (query.length > 1 || activeFilter) && !searching ? (
            <div className="text-center py-8">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)' }}
              >
                <Music className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">No results found</p>
            </div>
          ) : null}
        </main>

        <BottomNav />
        <MiniPlayer />
        <FullscreenPlayer />
      </div>
    </TabTransition>
  );
};

export default Search;
