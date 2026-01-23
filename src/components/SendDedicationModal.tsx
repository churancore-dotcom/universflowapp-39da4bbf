import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Music, Heart, Users, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Song } from '@/contexts/PlayerContext';
import { toast } from 'sonner';
import { iosSpring, iosBounce } from '@/lib/animations';

interface SendDedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
}

interface Friend {
  id: string;
  friendId: string;
  username: string;
  email: string;
}

const SendDedicationModal = ({ isOpen, onClose, song }: SendDedicationModalProps) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchFriends();
    }
  }, [isOpen, user]);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);

    const { data: friendships } = await supabase
      .from('friends')
      .select('*')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (friendships) {
      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, email')
        .in('user_id', friendIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const mappedFriends: Friend[] = friendships.map(f => {
        const otherUserId = f.user_id === user.id ? f.friend_id : f.user_id;
        const profile = profileMap.get(otherUserId);
        
        return {
          id: f.id,
          friendId: otherUserId,
          username: profile?.username || profile?.email?.split('@')[0] || 'User',
          email: profile?.email || '',
        };
      });

      setFriends(mappedFriends);
    }

    setLoading(false);
  };

  const handleSend = async () => {
    if (!user || !selectedFriend || !song) return;
    setSending(true);

    const { error } = await supabase
      .from('song_dedications')
      .insert({
        sender_id: user.id,
        recipient_id: selectedFriend.friendId,
        song_id: song.id,
        message: message.trim() || null,
      });

    if (error) {
      toast.error('Failed to send dedication');
    } else {
      toast.success(`Song dedicated to ${selectedFriend.username}! 💝`);
      onClose();
      setSelectedFriend(null);
      setMessage('');
    }

    setSending(false);
  };

  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed inset-4 z-[60] flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={iosSpring}
      >
        <div 
          className="w-full max-w-md max-h-[80vh] overflow-hidden rounded-3xl pointer-events-auto flex flex-col"
          style={{
            background: 'rgba(28, 28, 30, 0.98)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Dedicate Song</h2>
                <p className="text-sm text-muted-foreground">Send to a friend</p>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Song Preview */}
          {song && (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                {song.cover_url ? (
                  <img src={song.cover_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Music className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{song.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
              </div>
            </div>
          )}

          {/* Friend Selection */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <motion.div 
                  className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : friends.length === 0 ? (
              <motion.div
                className="text-center py-12 px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="font-semibold mb-2">No friends yet</h3>
                <p className="text-sm text-muted-foreground">
                  Add friends to send song dedications
                </p>
              </motion.div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search friends..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-primary"
                  />
                </div>

                <p className="text-sm font-medium text-muted-foreground">Select a friend</p>
                
                {filteredFriends.map((friend, index) => (
                  <motion.button
                    key={friend.id}
                    onClick={() => setSelectedFriend(friend)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors ${
                      selectedFriend?.id === friend.id 
                        ? 'bg-primary/20 border border-primary' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedFriend?.id === friend.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-gradient-to-br from-primary to-accent'
                    }`}>
                      <span className="text-lg font-bold text-white">
                        {friend.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold truncate">{friend.username}</p>
                      <p className="text-sm text-muted-foreground truncate">{friend.email}</p>
                    </div>
                    {selectedFriend?.id === friend.id && (
                      <motion.div
                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={iosBounce}
                      >
                        <Heart className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Message Input */}
          {selectedFriend && (
            <motion.div
              className="p-4 border-t border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message (optional)..."
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-primary resize-none h-20"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{message.length}/200</p>
            </motion.div>
          )}

          {/* Send Button */}
          <div className="p-4 border-t border-white/10">
            <motion.button
              onClick={handleSend}
              disabled={!selectedFriend || sending}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={iosBounce}
            >
              {sending ? (
                <motion.div 
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {selectedFriend ? `Send to ${selectedFriend.username}` : 'Select a friend'}
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SendDedicationModal;
