import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Music, Play, Clock, Mail, MailOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import { toast } from 'sonner';
import { iosSpring, iosBounce } from '@/lib/animations';

interface DedicationsInboxProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Dedication {
  id: string;
  senderId: string;
  senderName: string;
  song: Song;
  message: string | null;
  isRead: boolean;
  createdAt: Date;
}

const DedicationsInbox = ({ isOpen, onClose }: DedicationsInboxProps) => {
  const { user } = useAuth();
  const { playSong, setQueue } = usePlayer();
  const [dedications, setDedications] = useState<Dedication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchDedications();

      // Realtime subscription
      const channel = supabase
        .channel('dedications')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'song_dedications', filter: `recipient_id=eq.${user.id}` },
          () => fetchDedications()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, user]);

  const fetchDedications = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('song_dedications')
      .select(`
        id,
        sender_id,
        song_id,
        message,
        is_read,
        created_at,
        songs(id, title, artist, album, cover_url, audio_url, duration),
        profiles:sender_id(username, email)
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const mappedDedications: Dedication[] = data.map(d => {
        const song = d.songs as any;
        const sender = d.profiles as any;
        
        return {
          id: d.id,
          senderId: d.sender_id,
          senderName: sender?.username || sender?.email?.split('@')[0] || 'Someone',
          song: {
            id: song?.id,
            title: song?.title || 'Unknown',
            artist: song?.artist || 'Unknown',
            album: song?.album,
            cover_url: song?.cover_url,
            audio_url: song?.audio_url,
            duration: song?.duration,
          },
          message: d.message,
          isRead: d.is_read,
          createdAt: new Date(d.created_at),
        };
      });

      setDedications(mappedDedications);
    }

    setLoading(false);
  };

  const markAsRead = async (dedicationId: string) => {
    await supabase
      .from('song_dedications')
      .update({ is_read: true })
      .eq('id', dedicationId);

    setDedications(prev => 
      prev.map(d => d.id === dedicationId ? { ...d, isRead: true } : d)
    );
  };

  const handlePlay = (dedication: Dedication) => {
    if (!dedication.isRead) {
      markAsRead(dedication.id);
    }
    
    const songs = dedications.map(d => d.song).filter(s => s.audio_url);
    setQueue(songs);
    playSong(dedication.song);
    toast.success(`Playing ${dedication.song.title} 💝`);
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

  const unreadCount = dedications.filter(d => !d.isRead).length;

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center relative">
                <Heart className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-xs flex items-center justify-center text-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-bold text-lg">Song Dedications</h1>
                <p className="text-sm text-muted-foreground">{dedications.length} dedications</p>
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

          {/* Dedications List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <motion.div 
                  className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : dedications.length === 0 ? (
              <motion.div
                className="text-center py-20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="font-semibold mb-2">No dedications yet</h3>
                <p className="text-sm text-muted-foreground">
                  When friends send you songs, they'll appear here
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {dedications.map((dedication, index) => (
                  <motion.div
                    key={dedication.id}
                    className={`rounded-2xl overflow-hidden ${!dedication.isRead ? 'ring-2 ring-pink-500/50' : ''}`}
                    style={{
                      background: !dedication.isRead 
                        ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.1))' 
                        : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...iosSpring, delay: index * 0.05 }}
                  >
                    {/* Sender Info */}
                    <div className="flex items-center gap-3 p-4 border-b border-white/10">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {dedication.senderName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{dedication.senderName}</span>
                          {!dedication.isRead && (
                            <span className="text-xs bg-pink-500/30 text-pink-300 px-2 py-0.5 rounded-full">NEW</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(dedication.createdAt)}
                        </span>
                      </div>
                      {dedication.isRead ? (
                        <MailOpen className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Mail className="w-5 h-5 text-pink-400" />
                      )}
                    </div>

                    {/* Message */}
                    {dedication.message && (
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-sm italic text-muted-foreground">"{dedication.message}"</p>
                      </div>
                    )}

                    {/* Song */}
                    <motion.button
                      onClick={() => handlePlay(dedication)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="relative">
                        {dedication.song.cover_url ? (
                          <img 
                            src={dedication.song.cover_url} 
                            alt="" 
                            className="w-14 h-14 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Music className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 hover:opacity-100 transition-opacity">
                          <Play className="w-6 h-6 text-white" fill="white" />
                        </div>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold truncate">{dedication.song.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{dedication.song.artist}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <Play className="w-5 h-5 text-primary-foreground" fill="currentColor" />
                      </div>
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DedicationsInbox;
