import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Settings, LogOut, Shield, Music, Heart, Clock, ChevronRight, BarChart3, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import ListeningStats from '@/components/ListeningStats';
import FriendActivity from '@/components/FriendActivity';
import Crossfade from '@/components/Crossfade';
import { SheetTransition } from '@/components/PageTransition';
import { iosSpring, iosBounce } from '@/lib/animations';

const Profile = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ likedSongs: 0, recentPlays: 0, playlists: 0 });
  const [showStats, setShowStats] = useState(false);
  const [showFriendActivity, setShowFriendActivity] = useState(false);
  const [showCrossfade, setShowCrossfade] = useState(false);

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

  const menuItems = [
    ...(isAdmin ? [{ icon: Shield, label: 'Admin Panel', action: () => navigate('/admin'), color: 'text-primary' }] : []),
    { icon: BarChart3, label: 'Your Stats', action: () => setShowStats(true), color: 'text-purple-400' },
    { icon: Users, label: 'Friend Activity', action: () => setShowFriendActivity(true), color: 'text-green-400' },
    { icon: Zap, label: 'Playback Settings', action: () => setShowCrossfade(true), color: 'text-cyan-400' },
    { icon: Settings, label: 'Settings', action: () => navigate('/settings'), color: 'text-foreground' },
    { icon: LogOut, label: 'Sign Out', action: handleLogout, color: 'text-destructive', destructive: true },
  ];

  return (
    <SheetTransition>
      <motion.div 
        className="min-h-screen bg-black pb-52"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
      {/* iOS-style header */}
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
          className="text-[28px] font-bold"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...iosSpring, delay: 0.1 }}
        >
          Profile
        </motion.h1>
      </motion.header>

      <main className="px-5 pt-6">
        {/* Profile Card - iOS style */}
        <motion.div
          className="rounded-3xl p-6 mb-6"
          style={{
            background: 'rgba(28, 28, 30, 0.8)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={iosSpring}
        >
          <div className="flex items-center gap-5">
            <motion.div 
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(211 100% 50%), hsl(328 100% 54%))',
                boxShadow: '0 8px 30px -5px hsl(211 100% 50% / 0.4)',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={iosBounce}
            >
              <User className="w-10 h-10 text-white" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <motion.h2 
                className="text-xl font-bold truncate"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...iosSpring, delay: 0.15 }}
              >
                {user?.email?.split('@')[0] || 'User'}
              </motion.h2>
              <motion.p 
                className="text-sm text-muted-foreground truncate flex items-center gap-2 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Mail className="w-4 h-4" />
                {user?.email}
              </motion.p>
              {isAdmin && (
                <motion.span 
                  className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: 'hsl(211 100% 50% / 0.2)',
                    color: 'hsl(211 100% 60%)',
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...iosBounce, delay: 0.25 }}
                >
                  <Shield className="w-3 h-3" /> Admin
                </motion.span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats - iOS style cards */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 0.15 }}
        >
          {[
            { icon: Heart, label: 'Liked', value: stats.likedSongs, color: 'from-pink-500 to-rose-500' },
            { icon: Clock, label: 'Plays', value: stats.recentPlays, color: 'from-cyan-500 to-blue-500' },
            { icon: Music, label: 'Playlists', value: stats.playlists, color: 'from-purple-500 to-violet-500' },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="rounded-2xl p-4 text-center"
                style={{
                  background: 'rgba(28, 28, 30, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ ...iosBounce, delay: 0.2 + index * 0.08 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div 
                  className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-br ${stat.color}`}
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </motion.div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Menu Items - iOS style list */}
        <motion.div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(28, 28, 30, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 0.35 }}
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all ${
                  index !== menuItems.length - 1 ? 'border-b border-white/[0.06]' : ''
                }`}
                onClick={item.action}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...iosSpring, delay: 0.4 + index * 0.08 }}
                whileTap={{ 
                  scale: 0.98, 
                  backgroundColor: item.destructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)' 
                }}
              >
                <motion.div 
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}
                  style={{
                    background: item.destructive 
                      ? 'rgba(239, 68, 68, 0.15)' 
                      : item.color === 'text-primary' 
                        ? 'rgba(59, 130, 246, 0.15)' 
                        : 'rgba(118, 118, 128, 0.12)',
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={iosBounce}
                >
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </motion.div>
                <span className={`font-medium flex-1 ${item.color}`}>{item.label}</span>
                {!item.destructive && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              </motion.button>
            );
          })}
        </motion.div>
      </main>

      <BottomNav />
      <MiniPlayer />
      <FullscreenPlayer />
      <ListeningStats isOpen={showStats} onClose={() => setShowStats(false)} />
      <FriendActivity isOpen={showFriendActivity} onClose={() => setShowFriendActivity(false)} />
      <Crossfade isOpen={showCrossfade} onClose={() => setShowCrossfade(false)} />
      </motion.div>
    </SheetTransition>
  );
};

export default Profile;
