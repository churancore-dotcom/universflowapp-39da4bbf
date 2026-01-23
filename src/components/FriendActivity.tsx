import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Music, Clock, Radio, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { iosSpring } from '@/lib/animations';

interface FriendActivityProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Activity {
  id: string;
  username: string;
  email: string;
  songTitle: string;
  artistName: string;
  coverUrl?: string;
  playedAt: Date;
  isLive: boolean;
}

const FriendActivity = ({ isOpen, onClose }: FriendActivityProps) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
      // Set up realtime subscription
      const channel = supabase
        .channel('friend-activity')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recently_played' }, fetchActivities)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen]);

  const fetchActivities = async () => {
    setLoading(true);
    
    // Fetch recent plays from all users (simulating friend activity)
    const { data } = await supabase
      .from('recently_played')
      .select(`
        id,
        played_at,
        user_id,
        songs(title, artist, cover_url),
        profiles:user_id(username, email)
      `)
      .order('played_at', { ascending: false })
      .limit(20);

    if (data) {
      const now = new Date();
      const activities: Activity[] = data
        .filter(item => item.user_id !== user?.id) // Exclude current user
        .map(item => {
          const song = item.songs as any;
          const profile = item.profiles as any;
          const playedAt = new Date(item.played_at);
          const diffMins = Math.floor((now.getTime() - playedAt.getTime()) / 60000);
          
          return {
            id: item.id,
            username: profile?.username || profile?.email?.split('@')[0] || 'Music Lover',
            email: profile?.email || '',
            songTitle: song?.title || 'Unknown',
            artistName: song?.artist || 'Unknown',
            coverUrl: song?.cover_url,
            playedAt,
            isLive: diffMins < 3, // Consider "live" if played within last 3 minutes
          };
        });
      
      setActivities(activities);
    }
    
    setLoading(false);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="h-full flex flex-col safe-area-pt safe-area-pb">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Friend Activity</h1>
                <p className="text-sm text-muted-foreground">See what others are playing</p>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Activity Feed */}
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <motion.div 
                  className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : activities.length === 0 ? (
              <motion.div
                className="text-center py-20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="font-semibold mb-2">No activity yet</h3>
                <p className="text-sm text-muted-foreground">
                  When others play music, you'll see it here
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 rounded-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...iosSpring, delay: index * 0.05 }}
                  >
                    {/* User Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {activity.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {activity.isLive && (
                        <motion.div
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border-2 border-black"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Headphones className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </div>

                    {/* Activity Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate">{activity.username}</span>
                        {activity.isLive && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {activity.coverUrl && (
                          <img 
                            src={activity.coverUrl} 
                            alt="" 
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{activity.songTitle}</p>
                          <p className="text-xs text-muted-foreground truncate">{activity.artistName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(activity.playedAt)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Info Footer */}
          <div className="px-6 py-4 border-t border-white/10">
            <p className="text-xs text-muted-foreground text-center">
              Activity updates in real-time • Only visible to other users
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FriendActivity;
