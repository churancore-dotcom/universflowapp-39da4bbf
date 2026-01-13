import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Music, X, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import { Input } from '@/components/ui/input';
import { iosSpring, iosBounce } from '@/lib/animations';

const genres = [
  { name: 'Pop', color: 'from-pink-500 to-rose-500' },
  { name: 'Rock', color: 'from-red-500 to-orange-500' },
  { name: 'Hip Hop', color: 'from-yellow-500 to-amber-500' },
  { name: 'R&B', color: 'from-purple-500 to-violet-500' },
  { name: 'Electronic', color: 'from-cyan-500 to-blue-500' },
  { name: 'Jazz', color: 'from-amber-600 to-yellow-600' },
  { name: 'Classical', color: 'from-slate-500 to-gray-500' },
  { name: 'Indie', color: 'from-emerald-500 to-teal-500' },
];

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { playSong, currentSong, isPlaying } = usePlayer();

  useEffect(() => {
    if (query.length > 1) {
      const timer = setTimeout(() => searchSongs(), 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  const searchSongs = async () => {
    setSearching(true);
    const { data } = await supabase
      .from('songs')
      .select('*')
      .eq('is_visible', true)
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`)
      .limit(20);

    if (data) {
      setResults(data.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album || undefined,
        cover_url: s.cover_url || undefined,
        audio_url: s.audio_url,
      })));
    }
    setSearching(false);
  };

  const searchByGenre = async (genre: string) => {
    setQuery(genre);
    setSearching(true);
    const { data } = await supabase
      .from('songs')
      .select('*')
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
      })));
    }
    setSearching(false);
  };

  return (
    <motion.div 
      className="min-h-screen bg-black pb-44"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* iOS-style header with search */}
      <motion.header
        className="sticky top-0 z-30 px-5 pt-4 pb-3 safe-area-pt"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={iosSpring}
      >
        <motion.h1 
          className="text-[28px] font-bold mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...iosSpring, delay: 0.1 }}
        >
          Search
        </motion.h1>
        
        {/* iOS-style search bar */}
        <motion.div 
          className="relative"
          animate={{
            scale: isFocused ? 1.01 : 1,
          }}
          transition={iosBounce}
        >
          <motion.div
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
            animate={{
              color: isFocused ? 'hsl(211 100% 50%)' : 'hsl(0 0% 40%)',
            }}
          >
            <SearchIcon className="w-5 h-5" />
          </motion.div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Artists, songs, or albums"
            className="pl-12 pr-20 h-12 text-[17px] rounded-xl border-0"
            style={{
              background: 'rgba(118, 118, 128, 0.24)',
            }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <motion.button
                onClick={() => setQuery('')}
                className="p-1.5 rounded-full bg-white/20"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileTap={{ scale: 0.85 }}
                transition={iosBounce}
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
            <motion.button
              className="p-1.5 text-muted-foreground"
              whileTap={{ scale: 0.85 }}
              transition={iosBounce}
            >
              <Mic className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      </motion.header>

      <main className="px-5 pt-6">
        {/* Genre Cards - iOS style grid */}
        <AnimatePresence mode="wait">
          {!query && (
            <motion.div
              key="genres"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={iosSpring}
            >
              <h2 className="text-[22px] font-bold mb-4">Browse All</h2>
              <div className="grid grid-cols-2 gap-3">
                {genres.map((genre, index) => (
                  <motion.button
                    key={genre.name}
                    className={`relative h-24 rounded-2xl overflow-hidden bg-gradient-to-br ${genre.color}`}
                    onClick={() => searchByGenre(genre.name)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...iosSpring, delay: index * 0.05 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="absolute bottom-3 left-4 text-lg font-bold text-white drop-shadow-lg">
                      {genre.name}
                    </span>
                    {/* Decorative notes */}
                    <motion.div
                      className="absolute top-2 right-2 w-12 h-12 bg-white/20 rounded-lg rotate-12"
                      initial={{ rotate: 12 }}
                      whileHover={{ rotate: 20, scale: 1.1 }}
                    />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results */}
        <AnimatePresence mode="wait">
          {searching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-16"
            >
              <motion.div 
                className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-lg font-bold mb-4">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </h2>
              <div className="space-y-1">
                {results.map((song, index) => {
                  const isActive = currentSong?.id === song.id;
                  return (
                    <motion.button
                      key={song.id}
                      className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-left ${
                        isActive ? 'bg-primary/10' : 'active:bg-white/5'
                      }`}
                      onClick={() => playSong(song)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...iosSpring, delay: index * 0.03 }}
                      whileTap={{ scale: 0.98, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <motion.div 
                        className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden flex-shrink-0"
                        whileHover={{ scale: 1.05 }}
                        transition={iosBounce}
                      >
                        {song.cover_url ? (
                          <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-6 h-6 text-muted-foreground" />
                        )}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-[15px] truncate ${isActive ? 'text-primary' : ''}`}>
                          {song.title}
                        </p>
                        <p className="text-[13px] text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      {isActive && isPlaying && (
                        <div className="flex items-end gap-[3px] h-4 mr-2">
                          {[...Array(3)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-[3px] bg-primary rounded-full"
                              animate={{ height: [5, 14, 5] }}
                              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                            />
                          ))}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : query.length > 1 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-16"
              transition={iosSpring}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...iosBounce, delay: 0.1 }}
              >
                <Music className="w-14 h-14 mx-auto mb-4 text-muted-foreground/50" />
              </motion.div>
              <p className="text-muted-foreground text-lg">No results found</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Try a different search term</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <BottomNav />
      <MiniPlayer />
      <FullscreenPlayer />
    </motion.div>
  );
};

export default Search;
