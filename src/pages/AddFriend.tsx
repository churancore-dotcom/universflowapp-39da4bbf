import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { iosSpring } from '@/lib/animations';

const AddFriend = () => {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'found' | 'not-found' | 'error' | 'success' | 'already-friends' | 'self'>('loading');
  const [targetUser, setTargetUser] = useState<{ username: string; email: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error('Please sign in to add friends');
        navigate('/auth', { state: { returnTo: `/add-friend/${shareCode}` } });
        return;
      }
      findUser();
    }
  }, [shareCode, user, authLoading]);

  const findUser = async () => {
    if (!shareCode || !user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, username, email')
      .eq('share_code', shareCode)
      .single();

    if (!profile) {
      setStatus('not-found');
      return;
    }

    if (profile.user_id === user.id) {
      setStatus('self');
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
        setStatus('already-friends');
      } else {
        setStatus('already-friends');
        toast.info('Friend request already pending');
      }
      setTargetUser({ username: profile.username || profile.email?.split('@')[0] || 'User', email: profile.email || '' });
      return;
    }

    setTargetUser({ username: profile.username || profile.email?.split('@')[0] || 'User', email: profile.email || '' });
    setStatus('found');
  };

  const handleAddFriend = async () => {
    if (!user || !shareCode) return;
    setSending(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('share_code', shareCode)
      .single();

    if (!profile) {
      toast.error('User not found');
      setSending(false);
      return;
    }

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
      setStatus('success');
      toast.success(`Friend request sent to ${targetUser?.username}! 🎉`);
    }

    setSending(false);
  };

  const goHome = () => navigate('/home');

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-sm rounded-3xl p-8 text-center"
        style={{
          background: 'rgba(28, 28, 30, 0.9)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={iosSpring}
      >
        {status === 'loading' && (
          <>
            <motion.div
              className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/20 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </motion.div>
            <h1 className="text-xl font-bold mb-2">Finding user...</h1>
            <p className="text-muted-foreground text-sm">Please wait</p>
          </>
        )}

        {status === 'not-found' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <X className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-xl font-bold mb-2">User Not Found</h1>
            <p className="text-muted-foreground text-sm mb-6">This invite link is invalid or expired</p>
            <motion.button
              onClick={goHome}
              className="w-full py-3 rounded-xl bg-white/10 font-medium"
              whileTap={{ scale: 0.95 }}
            >
              Go Home
            </motion.button>
          </>
        )}

        {status === 'self' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <UserPlus className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold mb-2">That's You!</h1>
            <p className="text-muted-foreground text-sm mb-6">You can't add yourself as a friend 😅</p>
            <motion.button
              onClick={goHome}
              className="w-full py-3 rounded-xl bg-white/10 font-medium"
              whileTap={{ scale: 0.95 }}
            >
              Go Home
            </motion.button>
          </>
        )}

        {status === 'already-friends' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-xl font-bold mb-2">Already Connected!</h1>
            <p className="text-muted-foreground text-sm mb-6">You're already friends with {targetUser?.username}</p>
            <motion.button
              onClick={goHome}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium"
              whileTap={{ scale: 0.95 }}
            >
              Go to App
            </motion.button>
          </>
        )}

        {status === 'found' && targetUser && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {targetUser.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl font-bold mb-1">{targetUser.username}</h1>
            <p className="text-muted-foreground text-sm mb-6">wants to connect with you</p>
            
            <motion.button
              onClick={handleAddFriend}
              disabled={sending}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Send Friend Request
                </>
              )}
            </motion.button>
            
            <motion.button
              onClick={goHome}
              className="w-full py-3 rounded-xl bg-white/10 font-medium"
              whileTap={{ scale: 0.95 }}
            >
              Maybe Later
            </motion.button>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-green-500/20 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <Check className="w-10 h-10 text-green-400" />
            </motion.div>
            <h1 className="text-xl font-bold mb-2">Request Sent! 🎉</h1>
            <p className="text-muted-foreground text-sm mb-6">
              {targetUser?.username} will see your friend request
            </p>
            <motion.button
              onClick={goHome}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium"
              whileTap={{ scale: 0.95 }}
            >
              Continue to App
            </motion.button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AddFriend;
