import { useState, useEffect } from 'react';
import { User, Settings, LogOut, Shield, Heart, ListMusic, ChevronRight, Crown, Edit2, Check, X, Star, Headphones, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import BottomNav from '@/components/BottomNav';
import RedeemCodeModal from '@/components/RedeemCodeModal';
import PremiumBadge from '@/components/PremiumBadge';
import ReviewModal from '@/components/ReviewModal';
import ReviewsSheet from '@/components/ReviewsSheet';
import { TabTransition } from '@/components/PageTransition';
import EmailVerificationCard from '@/components/EmailVerificationCard';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import { resolveAvatar } from '@/lib/avatars';
import { Camera } from 'lucide-react';

interface ProfileData {
  username: string | null;
  username_changed: boolean;
  avatar_url: string | null;
}

const Profile = () => {
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ likedSongs: 0, playlists: 0, downloads: 0 });
  const [listenStats, setListenStats] = useState<{ minutes: number; topArtist: string | null; topSong: string | null; streak: number }>({ minutes: 0, topArtist: null, topSong: null, streak: 0 });
  const [statsReady, setStatsReady] = useState(false);
  const [showRedeemCode, setShowRedeemCode] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showReviewsList, setShowReviewsList] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({ username: null, username_changed: false, avatar_url: null });
  const [profileReady, setProfileReady] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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
        .select('username, username_changed, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfileData({
          username: data.username,
          username_changed: (data as any).username_changed || false,
          avatar_url: (data as any).avatar_url || null,
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
      const [liked, playlists, plays] = await Promise.all([
        supabase.from('user_library').select('id').eq('user_id', user.id),
        supabase.from('playlists').select('id').eq('user_id', user.id),
        supabase.from('song_play_events').select('title,artist,duration_played,played_at').eq('user_id', user.id).order('played_at', { ascending: false }).limit(500),
      ]);
      setStats({
        likedSongs: liked.data?.length || 0,
        playlists: playlists.data?.length || 0,
        downloads: 0,
      });

      const rows = (plays.data as any[]) || [];
      const totalSeconds = rows.reduce((sum, r) => sum + (Number(r.duration_played) || 0), 0);
      const artistCount = new Map<string, number>();
      const songCount = new Map<string, number>();
      const dayKeys = new Set<string>();
      rows.forEach((r) => {
        if (r.artist) artistCount.set(r.artist, (artistCount.get(r.artist) || 0) + 1);
        if (r.title) songCount.set(r.title, (songCount.get(r.title) || 0) + 1);
        if (r.played_at) dayKeys.add(new Date(r.played_at).toISOString().slice(0, 10));
      });
      const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Compute consecutive-day streak ending today
      let streak = 0;
      const cursor = new Date();
      for (let i = 0; i < 60; i++) {
        const key = cursor.toISOString().slice(0, 10);
        if (dayKeys.has(key)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else if (i === 0) {
          // not played today — try yesterday before breaking
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }

      setListenStats({
        minutes: Math.round(totalSeconds / 60),
        topArtist: top(artistCount),
        topSong: top(songCount),
        streak,
      });
    } finally {
      setStatsReady(true);
    }
  };

  const handleSaveUsername = async () => {
    if (!user || !newUsername.trim()) return;
    if (newUsername.trim().length < 3) { toast.error('Username must be at least 3 characters'); return; }
    if (newUsername.trim().length > 20) { toast.error('Username must be less than 20 characters'); return; }
    if (profileData.username_changed) { toast.error('You can only change your username once'); return; }

    const confirmed = window.confirm(`Set your username to "${newUsername.trim()}"?\n\nThis can only be done once and cannot be changed later.`);
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername.trim(), username_changed: true })
        .eq('user_id', user.id);
      if (error) throw error;
      setProfileData(prev => ({ ...prev, username: newUsername.trim(), username_changed: true }));
      setIsEditingUsername(false);
      toast.success('Username set!');
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

  const displayName = profileData.username || user?.email?.split('@')[0] || 'You';
  const canChangeUsername = !profileData.username_changed;
  const profileSettled = !authLoading && !premiumLoading && profileReady && statsReady;

  return (
    <TabTransition>
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-32 safe-area-pt" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* === Identity Hero === */}
          <section className="relative px-5 pt-6 pb-8 overflow-hidden">
            {/* Soft rose aura background — static, GPU cheap */}
            <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full opacity-40 blur-[80px] uf-rose-gradient pointer-events-none" />
            <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full opacity-25 blur-[90px] pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.6), transparent 70%)' }} />

            <div className="relative flex flex-col items-center text-center">
              <button
                onClick={() => user && setShowAvatarPicker(true)}
                className="relative active:scale-95 transition"
                aria-label="Change avatar"
              >
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center ring-4 ring-white/10 shadow-2xl overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(18 100% 78%))' }}
                >
                  {resolveAvatar(profileData.avatar_url) ? (
                    <img
                      src={resolveAvatar(profileData.avatar_url)!}
                      alt="Profile avatar"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-white" strokeWidth={1.5} />
                  )}
                </div>
                {isPremium ? (
                  <div
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', border: '3px solid hsl(var(--background))' }}
                  >
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg bg-primary"
                    style={{ border: '3px solid hsl(var(--background))' }}
                  >
                    <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
              </button>

              <div className="mt-4 w-full">
                {!profileSettled ? (
                  <div className="space-y-2 animate-pulse flex flex-col items-center">
                    <div className="h-6 w-40 rounded bg-muted/40" />
                    <div className="h-3 w-24 rounded bg-muted/25" />
                  </div>
                ) : isEditingUsername ? (
                  <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                    <Input
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="h-9 text-center bg-white/10 border-white/20"
                      placeholder="Enter username"
                      maxLength={20}
                      autoFocus
                    />
                    <button onClick={handleSaveUsername} disabled={isSaving} aria-label="Save" className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-400" />
                    </button>
                    <button onClick={() => { setIsEditingUsername(false); setNewUsername(profileData.username || ''); }} aria-label="Cancel" className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                      {canChangeUsername && (
                        <button onClick={() => setIsEditingUsername(true)} aria-label="Edit username" className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition">
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1.5">
                      {isPremium ? <PremiumBadge size="xs" /> : (
                        <span className="text-[11px] text-muted-foreground/70 uppercase tracking-[0.18em] font-semibold">Free Account</span>
                      )}
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'hsl(211 100% 50% / 0.2)', color: 'hsl(211 100% 60%)' }}>
                          <Shield className="w-2.5 h-2.5" /> Admin
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <div className="px-4 -mt-2 space-y-4">

            {/* Email verification (only when needed) */}
            <EmailVerificationCard />

            {/* === Listening Hero === */}
            {profileSettled && user && (
              <div className="uf-bento-card p-5 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-30 blur-3xl uf-rose-gradient pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/40 text-[10px] font-extrabold uppercase tracking-[0.2em]">Your Listening</span>
                    {listenStats.streak > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.06] border border-white/10">
                        🔥 {listenStats.streak}d streak
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[56px] leading-none font-display tracking-tight">{listenStats.minutes.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">minutes</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Top Artist</p>
                      <p className="text-sm font-semibold truncate">{listenStats.topArtist || '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Top Song</p>
                      <p className="text-sm font-semibold truncate">{listenStats.topSong || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === Quick Access (replaces stat counters) === */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/library')}
                className="rounded-3xl p-4 text-left bg-card border border-white/5 active:scale-[0.98] transition flex flex-col gap-2"
              >
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center uf-rose-gradient">
                  <Heart className="w-4 h-4 text-black" fill="currentColor" />
                </div>
                <div>
                  <p className="text-base font-bold leading-tight">Liked Songs</p>
                  <p className="text-[11px] text-muted-foreground">{profileSettled ? `${stats.likedSongs} tracks` : '—'}</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/library')}
                className="rounded-3xl p-4 text-left bg-card border border-white/5 active:scale-[0.98] transition flex flex-col gap-2"
              >
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white/10">
                  <ListMusic className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <p className="text-base font-bold leading-tight">Playlists</p>
                  <p className="text-[11px] text-muted-foreground">{profileSettled ? `${stats.playlists} created` : '—'}</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/downloads')}
                className="rounded-3xl p-4 text-left bg-card border border-white/5 active:scale-[0.98] transition flex flex-col gap-2"
              >
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white/10">
                  <Download className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <p className="text-base font-bold leading-tight">Downloads</p>
                  <p className="text-[11px] text-muted-foreground">Offline library</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="rounded-3xl p-4 text-left bg-card border border-white/5 active:scale-[0.98] transition flex flex-col gap-2"
              >
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white/10">
                  <Headphones className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <p className="text-base font-bold leading-tight">Audio</p>
                  <p className="text-[11px] text-muted-foreground">EQ & playback</p>
                </div>
              </button>
            </div>

            {/* === Premium Upgrade === */}
            {profileSettled && !isPremium && (
              <button
                onClick={() => navigate('/premium')}
                className="w-full rounded-3xl p-4 text-left relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(18 100% 70% / 0.12))', border: '1px solid hsl(var(--primary) / 0.25)' }}
              >
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-40 blur-3xl uf-rose-gradient pointer-events-none" />
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base leading-tight">Go Premium</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Ad-free · Offline · Studio EQ · HQ Audio</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            )}

            {profileSettled && !isPremium && (
              <button
                onClick={() => setShowRedeemCode(true)}
                className="w-full rounded-2xl py-3 text-sm font-semibold bg-white/[0.04] border border-white/[0.08] active:bg-white/10 transition"
              >
                Redeem a code
              </button>
            )}

            {/* === Menu === */}
            <div className="rounded-3xl overflow-hidden bg-card border border-white/5">
              {profileSettled && isAdmin && (
                <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-white/[0.06] active:bg-white/5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/20"><Shield className="w-4 h-4 text-primary" /></div>
                  <span className="flex-1 text-sm font-medium">Admin Panel</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-white/[0.06] active:bg-white/5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10"><Settings className="w-4 h-4 text-foreground" /></div>
                <span className="flex-1 text-sm font-medium">Settings</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => setShowReviewsList(true)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-white/[0.06] active:bg-white/5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-yellow-500/20">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </div>
                <span className="flex-1 text-sm font-medium">Reviews</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-destructive/20"><LogOut className="w-4 h-4 text-destructive" /></div>
                <span className="flex-1 text-sm font-medium text-destructive">Sign Out</span>
              </button>
            </div>
          </div>
        </main>

        <BottomNav />
        {showRedeemCode && <RedeemCodeModal isOpen={showRedeemCode} onClose={() => setShowRedeemCode(false)} />}
        <ReviewModal isOpen={showReview} onClose={() => setShowReview(false)} />
        <ReviewsSheet
          isOpen={showReviewsList}
          onClose={() => setShowReviewsList(false)}
          onWriteReview={() => { setShowReviewsList(false); setTimeout(() => setShowReview(true), 250); }}
        />
        {user && (
          <AvatarPickerModal
            isOpen={showAvatarPicker}
            onClose={() => setShowAvatarPicker(false)}
            userId={user.id}
            currentAvatar={profileData.avatar_url}
            onSaved={(id) => setProfileData(prev => ({ ...prev, avatar_url: id }))}
          />
        )}
      </div>
    </TabTransition>
  );
};

export default Profile;
