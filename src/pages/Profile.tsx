import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Settings, LogOut, Shield, Music, Heart, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import { Button } from '@/components/ui/button';

const Profile = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ likedSongs: 0, recentPlays: 0, playlists: 0 });

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    const [liked, recent, playlists] = await Promise.all([
      supabase.from('user_library').select('id').eq('user_id', user.id),
      supabase.from('recently_played').select('id').eq('user_id', user.id),
      supabase.from('playlists').select('id').eq('user_id', user.id),
    ]);

    setStats({
      likedSongs: liked.data?.length || 0,
      recentPlays: recent.data?.length || 0,
      playlists: playlists.data?.length || 0,
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-40">
      <motion.header
        className="sticky top-0 z-30 glass px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold">Profile</h1>
      </motion.header>

      <main className="px-6 pt-6">
        {/* Profile Card */}
        <motion.div
          className="glass rounded-2xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-display font-bold truncate">
                {user?.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { icon: Heart, label: 'Liked', value: stats.likedSongs },
            { icon: Clock, label: 'Plays', value: stats.recentPlays },
            { icon: Music, label: 'Playlists', value: stats.playlists },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="glass rounded-xl p-4 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Actions */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isAdmin && (
            <motion.button
              className="w-full flex items-center gap-4 p-4 glass rounded-xl hover:bg-white/5 transition-all"
              onClick={() => navigate('/admin')}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-medium">Admin Panel</span>
            </motion.button>
          )}

          <motion.button
            className="w-full flex items-center gap-4 p-4 glass rounded-xl hover:bg-white/5 transition-all"
            onClick={() => navigate('/settings')}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </motion.button>

          <motion.button
            className="w-full flex items-center gap-4 p-4 glass rounded-xl text-destructive hover:bg-destructive/10 transition-all"
            onClick={handleLogout}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </motion.button>
        </motion.div>
      </main>

      <BottomNav />
      <MiniPlayer />
      <FullscreenPlayer />
    </div>
  );
};

export default Profile;
