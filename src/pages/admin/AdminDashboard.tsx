import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Users, PlayCircle, TrendingUp, Upload, Disc } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Stats {
  totalSongs: number;
  totalUsers: number;
  totalPlays: number;
  totalAlbums: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalSongs: 0, totalUsers: 0, totalPlays: 0, totalAlbums: 0 });
  const [recentSongs, setRecentSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchRecentSongs();
  }, []);

  const fetchStats = async () => {
    const [songsRes, usersRes, albumsRes] = await Promise.all([
      supabase.from('songs').select('id, play_count'),
      supabase.from('profiles').select('id'),
      supabase.from('albums').select('id'),
    ]);

    const totalPlays = songsRes.data?.reduce((acc, song) => acc + (song.play_count || 0), 0) || 0;

    setStats({
      totalSongs: songsRes.data?.length || 0,
      totalUsers: usersRes.data?.length || 0,
      totalPlays,
      totalAlbums: albumsRes.data?.length || 0,
    });
    setLoading(false);
  };

  const fetchRecentSongs = async () => {
    const { data } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentSongs(data || []);
  };

  const statCards = [
    { icon: Music, label: 'Total Songs', value: stats.totalSongs, color: 'from-primary to-cyan-400' },
    { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'from-accent to-pink-400' },
    { icon: PlayCircle, label: 'Total Plays', value: stats.totalPlays, color: 'from-green-500 to-emerald-400' },
    { icon: Disc, label: 'Albums', value: stats.totalAlbums, color: 'from-orange-500 to-amber-400' },
  ];

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your music platform</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              className="glass rounded-2xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-display font-bold mt-1">
                {loading ? '...' : stat.value.toLocaleString()}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Songs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <motion.div
          className="glass rounded-2xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-display font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <motion.button
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 transition-all"
              onClick={() => navigate('/admin/upload')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Upload className="w-5 h-5 text-primary" />
              <span className="font-medium">Upload New Music</span>
            </motion.button>
            <motion.button
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              onClick={() => navigate('/admin/songs')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Music className="w-5 h-5" />
              <span className="font-medium">Manage Songs</span>
            </motion.button>
            <motion.button
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              onClick={() => navigate('/admin/analytics')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">View Analytics</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Recent Songs */}
        <motion.div
          className="glass rounded-2xl p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-display font-bold mb-4">Recent Uploads</h2>
          {recentSongs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No songs uploaded yet</p>
              <button
                className="mt-3 text-primary hover:underline text-sm"
                onClick={() => navigate('/admin/upload')}
              >
                Upload your first song
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSongs.map((song, index) => (
                <motion.div
                  key={song.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
                    {song.cover_url ? (
                      <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(song.created_at).toLocaleDateString()}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
