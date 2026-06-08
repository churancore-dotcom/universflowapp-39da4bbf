import { useState, useEffect } from 'react';
import { User, Mail, Settings, LogOut, Shield, Music, Heart, Clock, ChevronRight, Crown, Edit2, Check, X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import BottomNav from '@/components/BottomNav';
import RedeemCodeModal from '@/components/RedeemCodeModal';
import PremiumBadge from '@/components/PremiumBadge';
import CrossDeviceResumeCard from '@/components/CrossDeviceResumeCard';

import ReviewModal from '@/components/ReviewModal';
import ReviewsSheet from '@/components/ReviewsSheet';
import { TabTransition } from '@/components/PageTransition';
import EmailVerificationCard from '@/components/EmailVerificationCard';
import RoseHero from '@/components/RoseHero';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ProfileData {
  username: string | null;
  username_changed: boolean;
}

const Profile = () => {
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ likedSongs: 0, recentPlays: 0, playlists: 0 });
  const [listenStats, setListenStats] = useState<{ minutes: number; topArtist: string | null; topSong: string | null }>({ minutes: 0, topArtist: null, topSong: null });
  const [statsReady, setStatsReady] = useState(false);
  const [showRedeemCode, setShowRedeemCode] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showReviewsList, setShowReviewsList] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({ username: null, username_changed: false });
  const [profileReady, setProfileReady] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileReady(false);
      setStatsReady(false);
      fetchStats();
      fetchProfile();
    } else {
      setProfileReady(true);
      setStatsReady(true);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) { setProfileReady(true); return; }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username, username_changed')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setProfileData({
          username: data.username,
          username_changed: (data as any).username_changed || false,
        });
        setNewUsername(data.username || '');
      }
    } finally {
      setProfileReady(true);
    }
  };

  const fetchStats = async () => {
    if (!user) { setStatsReady(true); return; }
    try {
      const [liked, recent, playlists, plays] = await Promise.all([
        supabase.from('user_library').select('id').eq('user_id', user.id),
        supabase.from('recently_played').select('id').eq('user_id', user.id),
        supabase.from('playlists').select('id').eq('user_id', user.id),
        supabase.from('song_play_events').select('title,artist,duration_played').eq('user_id', user.id).order('played_at', { ascending: false }).limit(500),
      ]);
      setStats({
        likedSongs: liked.data?.length || 0,
        recentPlays: recent.data?.length || 0,
        playlists: playlists.data?.length || 0,
      });
      // Compute listening stats from play events
      const rows = (plays.data as any[]) || [];
      const totalSeconds = rows.reduce((sum, r) => sum + (Number(r.duration_played) || 0), 0);
      const artistCount = new Map<string, number>();
      const songCount = new Map<string, number>();
      rows.forEach((r) => {
        if (r.artist) artistCount.set(r.artist, (artistCount.get(r.artist) || 0) + 1);
        if (r.title) songCount.set(r.title, (songCount.get(r.title) || 0) + 1);
      });
      const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      setListenStats({
        minutes: Math.round(totalSeconds / 60),
        topArtist: top(artistCount),
        topSong: top(songCount),
      });
    } finally {
      setStatsReady(true);
    }
  };


  const handleSaveUsername = async () => {
    if (!user || !newUsername.trim()) return;

    if (newUsername.trim().length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }

    if (newUsername.trim().length > 20) {
      toast.error('Username must be less than 20 characters');
      return;
    }

    if (profileData.username_changed) {
      toast.error('You can only change your username once');
      return;
    }

    const confirmed = window.confirm(
      `Set your username to "${newUsername.trim()}"?\n\nThis can only be done once and cannot be changed later.`
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: newUsername.trim(),
          username_changed: true,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfileData(prev => ({ ...prev, username: newUsername.trim(), username_changed: true }));
      setIsEditingUsername(false);
      toast.success('Username set! This cannot be changed again.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update username');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayName = profileData.username || user?.email?.split('@')[0] || 'User';
  const canChangeUsername = !profileData.username_changed;
  const profileSettled = !authLoading && !premiumLoading && profileReady && statsReady;

  return (
    <TabTransition>
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <header className="flex-shrink-0 z-30 px-3 pt-3 pb-2 safe-area-pt">
          <RoseHero
            eyebrow={isPremium ? 'Premium member' : 'Universflow'}
            title={(displayName || 'PROFILE').toUpperCase()}
            subtitle={user?.email}
          />
        </header>

        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-32" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Email verification status */}
          <div className="mb-4">
            <EmailVerificationCard />
          </div>

          {/* Profile Card */}
          <div className="uf-bento-card p-4 mb-4">
            <div className="flex items-center gap-4 min-h-[86px]">
              <div
                className="relative w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(18 100% 82%))' }}
              >
                <User className="w-7 h-7 text-white" />
                {isPremium && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', border: '2px solid rgba(28, 28, 30, 0.9)' }}
                  >
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {!profileSettled ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 w-32 rounded bg-muted/50" />
                    <div className="h-3 w-44 rounded bg-muted/35" />
                    <div className="h-2.5 w-36 rounded bg-muted/25" />
                  </div>
                ) : (
                <>
                  <div className="flex items-center gap-2">
                  {isEditingUsername ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="h-8 text-sm bg-white/10 border-white/20"
                        placeholder="Enter username"
                        aria-label="Username"
                        maxLength={20}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveUsername}
                        disabled={isSaving}
                        aria-label="Save username"
                        className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-green-400" />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingUsername(false);
                          setNewUsername(profileData.username || '');
                        }}
                        aria-label="Cancel editing username"
                        className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-base font-bold truncate">{displayName}</h2>
                      {canChangeUsername && (
                        <button
                          onClick={() => setIsEditingUsername(true)}
                          aria-label="Edit username"
                          className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"
                        >
                          <Edit2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                      {isPremium && <PremiumBadge size="xs" />}
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3 h-3" />
                  {user?.email}
                </p>
                {!isEditingUsername && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {profileData.username_changed
                      ? 'Username saved for this account'
                      : 'Tap pencil to set your username (one-time only)'}
                  </p>
                )}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'hsl(211 100% 50% / 0.2)', color: 'hsl(211 100% 60%)' }}>
                    <Shield className="w-2.5 h-2.5" /> Admin
                  </span>
                )}
                </>
                )}
              </div>
            </div>
          </div>

          {/* Cross-Device Resume */}
          {profileSettled && user && <CrossDeviceResumeCard />}

          {/* Listening Stats Hero — real data from song_play_events */}
          {profileSettled && user && (
            <div className="uf-bento-card p-4 mb-4 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 blur-3xl uf-rose-gradient pointer-events-none" />
              <span className="text-white/40 text-[10px] font-extrabold uppercase tracking-[0.18em]">Your Listening</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[44px] leading-none font-display tracking-tight">{listenStats.minutes.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">minutes streamed</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 relative z-10">
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-2.5">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Top Artist</p>
                  <p className="text-sm font-semibold truncate">{listenStats.topArtist || '—'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-2.5">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Top Song</p>
                  <p className="text-sm font-semibold truncate">{listenStats.topSong || '—'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { icon: Heart, label: 'Liked', value: stats.likedSongs },
              { icon: Clock, label: 'Plays', value: stats.recentPlays },
              { icon: Music, label: 'Playlists', value: stats.playlists },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-3xl p-3 text-center bg-card border border-white/5">
                  <div className="w-8 h-8 rounded-2xl mx-auto mb-1.5 flex items-center justify-center uf-rose-gradient">
                    <Icon className="w-4 h-4 text-black" />
                  </div>
                  <p className="text-[24px] font-display leading-none tracking-wide">{profileSettled ? stat.value : '—'}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Menu Items */}
          <div className="rounded-3xl overflow-hidden bg-card border border-white/5">
            {profileSettled && isAdmin && (
              <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-white/[0.06] active:bg-white/5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20"><Shield className="w-4 h-4 text-primary" /></div>
                <span className="flex-1 text-sm font-medium">Admin Panel</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-white/[0.06] active:bg-white/5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10"><Settings className="w-4 h-4 text-foreground" /></div>
              <span className="flex-1 text-sm font-medium">Settings</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowReviewsList(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-white/[0.06] active:bg-white/5"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-yellow-500/20">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </div>
              <span className="flex-1 text-sm font-medium">Reviews</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-destructive/20"><LogOut className="w-4 h-4 text-destructive" /></div>
              <span className="flex-1 text-sm font-medium text-destructive">Sign Out</span>
            </button>
          </div>

          {/* Expiry reminders are delivered as a real device notification (see src/lib/expiryNotifications.ts) — no inline UI. */}


          {/* Premium Section */}
          {profileSettled && !isPremium && (
            <button
              onClick={() => navigate('/premium')}
              className="w-full mt-4 rounded-xl p-4 text-left"
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.1))', border: '1px solid rgba(139, 92, 246, 0.2)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)' }}>
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-sm block">Upgrade to Premium</span>
                  <span className="text-[10px] text-muted-foreground">Ad-free · Offline · HQ Audio</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          )}
        </main>

        <BottomNav />
        {showRedeemCode && <RedeemCodeModal isOpen={showRedeemCode} onClose={() => setShowRedeemCode(false)} />}
        
        <ReviewModal isOpen={showReview} onClose={() => setShowReview(false)} />
        <ReviewsSheet
          isOpen={showReviewsList}
          onClose={() => setShowReviewsList(false)}
          onWriteReview={() => { setShowReviewsList(false); setTimeout(() => setShowReview(true), 250); }}
        />
      </div>
    </TabTransition>
  );
};

export default Profile;
