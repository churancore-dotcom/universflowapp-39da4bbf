import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserPlus, Share2, Copy, Check, QrCode, Search, Mail, Clock, UserCheck, UserX, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { iosSpring, iosBounce } from '@/lib/animations';

interface FriendsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Friend {
  id: string;
  friendId: string;
  username: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  isSender: boolean;
  createdAt: Date;
}

interface Profile {
  user_id: string;
  username: string | null;
  email: string | null;
  share_code: string | null;
}

const FriendsManager = ({ isOpen, onClose }: FriendsManagerProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [searching, setSearching] = useState(false);

  const appUrl = window.location.origin;

  useEffect(() => {
    if (isOpen && user) {
      fetchFriends();
      fetchShareCode();
    }
  }, [isOpen, user]);

  const fetchShareCode = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('share_code')
      .eq('user_id', user.id)
      .single();
    
    if (data?.share_code) {
      setShareCode(data.share_code);
    } else {
      // Generate share code if missing
      const newCode = Math.random().toString(36).substring(2, 10);
      await supabase
        .from('profiles')
        .update({ share_code: newCode })
        .eq('user_id', user.id);
      setShareCode(newCode);
    }
  };

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch friendships where user is either sender or receiver
    const { data: friendships } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (friendships) {
      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Fetch profiles for friends
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
          status: f.status as 'pending' | 'accepted' | 'declined',
          isSender: f.user_id === user.id,
          createdAt: new Date(f.created_at),
        };
      });

      setFriends(mappedFriends.filter(f => f.status === 'accepted'));
      setPendingRequests(mappedFriends.filter(f => f.status === 'pending'));
    }

    setLoading(false);
  };

  const handleAddByCode = async () => {
    if (!user || !searchCode.trim()) return;
    setSearching(true);

    // Find user by share code
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, username, email')
      .eq('share_code', searchCode.trim())
      .single();

    if (!profile) {
      toast.error('User not found with this code');
      setSearching(false);
      return;
    }

    if (profile.user_id === user.id) {
      toast.error("That's your own code!");
      setSearching(false);
      return;
    }

    // Check if already friends or pending
    const { data: existing } = await supabase
      .from('friends')
      .select('id, status')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${profile.user_id}),and(user_id.eq.${profile.user_id},friend_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        toast.error('Already friends!');
      } else {
        toast.error('Request already pending');
      }
      setSearching(false);
      return;
    }

    // Send friend request
    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: user.id,
        friend_id: profile.user_id,
        status: 'pending',
      });

    if (error) {
      toast.error('Failed to send request');
    } else {
      toast.success(`Friend request sent to ${profile.username || profile.email?.split('@')[0]}!`);
      setSearchCode('');
      fetchFriends();
    }

    setSearching(false);
  };

  const handleAccept = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) {
      toast.error('Failed to accept request');
    } else {
      toast.success('Friend added! 🎉');
      fetchFriends();
    }
  };

  const handleDecline = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      toast.error('Failed to decline request');
    } else {
      toast.success('Request declined');
      fetchFriends();
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      toast.error('Failed to remove friend');
    } else {
      toast.success('Friend removed');
      fetchFriends();
    }
  };

  const copyShareLink = () => {
    const link = `${appUrl}/add-friend/${shareCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copied! Share it with friends 🔗');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareProfileLink = async () => {
    const link = `${appUrl}/add-friend/${shareCode}`;
    const text = `Add me as a friend on UniversFlow! 🎵`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Add me on UniversFlow', text, url: link });
      } catch (e) {
        copyShareLink();
      }
    } else {
      copyShareLink();
    }
  };

  const incomingRequests = pendingRequests.filter(r => !r.isSender);
  const outgoingRequests = pendingRequests.filter(r => r.isSender);

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Friends</h1>
                <p className="text-sm text-muted-foreground">{friends.length} friends</p>
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

          {/* Tabs */}
          <div className="flex gap-2 px-6 py-3 border-b border-white/10">
            {[
              { key: 'friends', label: 'Friends', icon: Users },
              { key: 'requests', label: 'Requests', icon: Inbox, badge: incomingRequests.length },
              { key: 'add', label: 'Add Friend', icon: UserPlus },
            ].map((tab) => (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors relative ${
                  activeTab === tab.key 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-xs flex items-center justify-center text-white">
                    {tab.badge}
                  </span>
                )}
              </motion.button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <motion.div 
                  className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : (
              <>
                {/* Friends List */}
                {activeTab === 'friends' && (
                  <div className="space-y-3">
                    {friends.length === 0 ? (
                      <motion.div
                        className="text-center py-16"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="font-semibold mb-2">No friends yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Share your profile link to connect with friends
                        </p>
                        <motion.button
                          onClick={() => setActiveTab('add')}
                          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
                          whileTap={{ scale: 0.95 }}
                        >
                          Add Friends
                        </motion.button>
                      </motion.div>
                    ) : (
                      friends.map((friend, index) => (
                        <motion.div
                          key={friend.id}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-white/5"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <span className="text-lg font-bold text-white">
                              {friend.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{friend.username}</p>
                            <p className="text-sm text-muted-foreground truncate">{friend.email}</p>
                          </div>
                          <motion.button
                            onClick={() => handleRemoveFriend(friend.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            whileTap={{ scale: 0.9 }}
                          >
                            <UserX className="w-5 h-5" />
                          </motion.button>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}

                {/* Requests */}
                {activeTab === 'requests' && (
                  <div className="space-y-6">
                    {/* Incoming */}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Inbox className="w-4 h-4" />
                        Incoming Requests ({incomingRequests.length})
                      </h3>
                      {incomingRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground/50 text-center py-8">No incoming requests</p>
                      ) : (
                        <div className="space-y-3">
                          {incomingRequests.map((request) => (
                            <motion.div
                              key={request.id}
                              className="flex items-center gap-4 p-4 rounded-2xl bg-white/5"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                            >
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
                                <span className="text-lg font-bold text-white">
                                  {request.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{request.username}</p>
                                <p className="text-xs text-muted-foreground">wants to be friends</p>
                              </div>
                              <div className="flex gap-2">
                                <motion.button
                                  onClick={() => handleAccept(request.id)}
                                  className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <UserCheck className="w-5 h-5" />
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDecline(request.id)}
                                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <UserX className="w-5 h-5" />
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Outgoing */}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Sent Requests ({outgoingRequests.length})
                      </h3>
                      {outgoingRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground/50 text-center py-8">No pending requests</p>
                      ) : (
                        <div className="space-y-3">
                          {outgoingRequests.map((request) => (
                            <motion.div
                              key={request.id}
                              className="flex items-center gap-4 p-4 rounded-2xl bg-white/5"
                            >
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center">
                                <span className="text-lg font-bold text-white">
                                  {request.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{request.username}</p>
                                <p className="text-xs text-muted-foreground">Pending</p>
                              </div>
                              <motion.button
                                onClick={() => handleDecline(request.id)}
                                className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10"
                                whileTap={{ scale: 0.9 }}
                              >
                                <X className="w-5 h-5" />
                              </motion.button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Add Friend */}
                {activeTab === 'add' && (
                  <div className="space-y-6">
                    {/* Share Your Profile */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Share2 className="w-5 h-5" />
                        Share Your Profile
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Share this link so friends can add you
                      </p>
                      
                      <div className="flex gap-2 mb-4">
                        <div className="flex-1 p-3 rounded-xl bg-black/30 font-mono text-sm truncate">
                          {shareCode || '...'}
                        </div>
                        <motion.button
                          onClick={copyShareLink}
                          className="p-3 rounded-xl bg-white/10 hover:bg-white/20"
                          whileTap={{ scale: 0.9 }}
                        >
                          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                        </motion.button>
                      </div>

                      <motion.button
                        onClick={shareProfileLink}
                        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
                        whileTap={{ scale: 0.98 }}
                      >
                        <Share2 className="w-5 h-5" />
                        Share Profile Link
                      </motion.button>
                    </div>

                    {/* Add by Code */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Add by Code
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Enter your friend's share code
                      </p>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={searchCode}
                          onChange={(e) => setSearchCode(e.target.value)}
                          placeholder="Enter code..."
                          className="flex-1 p-3 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-primary"
                        />
                        <motion.button
                          onClick={handleAddByCode}
                          disabled={!searchCode.trim() || searching}
                          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                          whileTap={{ scale: 0.95 }}
                        >
                          {searching ? (
                            <motion.div 
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                          ) : (
                            'Add'
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FriendsManager;
