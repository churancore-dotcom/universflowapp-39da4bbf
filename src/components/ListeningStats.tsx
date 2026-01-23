import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Music, 
  Clock, 
  TrendingUp, 
  Heart, 
  Calendar,
  Flame,
  BarChart3,
  Disc,
  Headphones
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { iosSpring } from '@/lib/animations';

interface ListeningStatsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Stats {
  totalPlays: number;
  totalMinutes: number;
  likedSongs: number;
  topGenre: string;
  topArtist: string;
  streakDays: number;
  topSongs: Array<{ title: string; artist: string; plays: number; cover_url?: string }>;
  genreBreakdown: Array<{ genre: string; percentage: number; color: string }>;
}

const GENRE_COLORS = [
  'from-rose-500 to-pink-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
];

const ListeningStats = ({ isOpen, onClose }: ListeningStatsProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalPlays: 0,
    totalMinutes: 0,
    likedSongs: 0,
    topGenre: 'Unknown',
    topArtist: 'Unknown',
    streakDays: 0,
    topSongs: [],
    genreBreakdown: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchStats();
    }
  }, [isOpen, user]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch recently played
      const { data: recentlyPlayed } = await supabase
        .from('recently_played')
        .select('song_id, played_at, songs(title, artist, duration, genre, cover_url)')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false });

      // Fetch liked songs
      const { data: liked } = await supabase
        .from('user_library')
        .select('id')
        .eq('user_id', user.id);

      if (recentlyPlayed) {
        // Calculate total plays and minutes
        const totalPlays = recentlyPlayed.length;
        const totalMinutes = Math.round(
          recentlyPlayed.reduce((acc, p) => {
            const song = p.songs as any;
            return acc + (song?.duration || 180);
          }, 0) / 60
        );

        // Count plays per song
        const songPlayCounts: Record<string, { title: string; artist: string; plays: number; cover_url?: string }> = {};
        const genreCounts: Record<string, number> = {};
        const artistCounts: Record<string, number> = {};

        recentlyPlayed.forEach(p => {
          const song = p.songs as any;
          if (!song) return;

          const key = `${song.title}-${song.artist}`;
          if (!songPlayCounts[key]) {
            songPlayCounts[key] = { title: song.title, artist: song.artist, plays: 0, cover_url: song.cover_url };
          }
          songPlayCounts[key].plays++;

          const genre = song.genre || 'Other';
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;

          artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
        });

        // Top songs
        const topSongs = Object.values(songPlayCounts)
          .sort((a, b) => b.plays - a.plays)
          .slice(0, 5);

        // Top genre
        const topGenre = Object.entries(genreCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

        // Top artist
        const topArtist = Object.entries(artistCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

        // Genre breakdown
        const totalGenrePlays = Object.values(genreCounts).reduce((a, b) => a + b, 0);
        const genreBreakdown = Object.entries(genreCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([genre, count], i) => ({
            genre,
            percentage: Math.round((count / totalGenrePlays) * 100),
            color: GENRE_COLORS[i % GENRE_COLORS.length],
          }));

        // Calculate streak (simplified - consecutive days with plays)
        const playDates = new Set(
          recentlyPlayed.map(p => new Date(p.played_at).toDateString())
        );
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          if (playDates.has(checkDate.toDateString())) {
            streak++;
          } else if (i > 0) {
            break;
          }
        }

        setStats({
          totalPlays,
          totalMinutes,
          likedSongs: liked?.length || 0,
          topGenre,
          topArtist,
          streakDays: streak,
          topSongs,
          genreBreakdown,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Background gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 0%, hsl(280 100% 50% / 0.2), transparent),
              radial-gradient(ellipse 60% 40% at 80% 60%, hsl(330 100% 50% / 0.15), transparent),
              radial-gradient(ellipse 50% 30% at 20% 80%, hsl(200 100% 50% / 0.1), transparent)
            `,
          }}
        />

        <div className="relative h-full overflow-y-auto custom-scrollbar safe-area-pt safe-area-pb">
          {/* Header */}
          <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <motion.h1 
              className="text-2xl font-bold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Your Stats
            </motion.h1>
            <motion.button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <motion.div 
                className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          ) : (
            <div className="px-6 pb-8 space-y-6">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Headphones, label: 'Total Plays', value: stats.totalPlays, color: 'from-primary to-cyan-400' },
                  { icon: Clock, label: 'Minutes', value: stats.totalMinutes.toLocaleString(), color: 'from-accent to-pink-400' },
                  { icon: Heart, label: 'Liked Songs', value: stats.likedSongs, color: 'from-rose-500 to-red-400' },
                  { icon: Flame, label: 'Day Streak', value: stats.streakDays, color: 'from-orange-500 to-amber-400' },
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      className="rounded-2xl p-5"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...iosSpring, delay: index * 0.1 }}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-3xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Top Artist & Genre */}
              <motion.div
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...iosSpring, delay: 0.4 }}
              >
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Your Favorites
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Top Artist</p>
                    <p className="font-semibold truncate">{stats.topArtist}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Top Genre</p>
                    <p className="font-semibold truncate">{stats.topGenre}</p>
                  </div>
                </div>
              </motion.div>

              {/* Genre Breakdown */}
              {stats.genreBreakdown.length > 0 && (
                <motion.div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...iosSpring, delay: 0.5 }}
                >
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    Genre Breakdown
                  </h3>
                  <div className="space-y-3">
                    {stats.genreBreakdown.map((genre, index) => (
                      <motion.div
                        key={genre.genre}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                      >
                        <div className="flex justify-between text-sm mb-1">
                          <span>{genre.genre}</span>
                          <span className="text-muted-foreground">{genre.percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${genre.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${genre.percentage}%` }}
                            transition={{ duration: 0.8, delay: 0.7 + index * 0.1 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Top Songs */}
              {stats.topSongs.length > 0 && (
                <motion.div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...iosSpring, delay: 0.6 }}
                >
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Music className="w-5 h-5 text-rose-400" />
                    Most Played
                  </h3>
                  <div className="space-y-3">
                    {stats.topSongs.map((song, index) => (
                      <motion.div
                        key={`${song.title}-${song.artist}`}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                      >
                        <span className={`w-6 text-center font-bold ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {index + 1}
                        </span>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
                          {song.cover_url ? (
                            <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Disc className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{song.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{song.plays} plays</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ListeningStats;
