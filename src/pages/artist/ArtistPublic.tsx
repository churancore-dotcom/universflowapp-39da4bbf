import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Heart, Music2, Play, UserPlus, UserCheck, Instagram, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';
import { FadeTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePlayer, type Song as PlayerSong } from '@/contexts/PlayerContext';

type Profile = {
  id: string;
  user_id: string;
  stage_name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  social_links: Record<string, any> | null;
  is_verified: boolean;
};

type Song = {
  id: string;
  title: string;
  cover_url: string | null;
  stream_url: string;
  duration: number | null;
  play_count: number;
  like_count: number;
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function ArtistPublic() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const player = usePlayer();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [followers, setFollowers] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (!p) { setLoading(false); return; }
      setProfile(p as Profile);

      const [{ data: s }, { count }, { data: follow }] = await Promise.all([
        supabase.from('artist_songs').select('*').eq('artist_user_id', (p as Profile).user_id).eq('status', 'live').order('created_at', { ascending: false }),
        supabase.from('artist_followers').select('id', { count: 'exact', head: true }).eq('artist_user_id', (p as Profile).user_id),
        user ? supabase.from('artist_followers').select('id').eq('artist_user_id', (p as Profile).user_id).eq('follower_user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setSongs((s ?? []) as Song[]);
      setFollowers(count ?? 0);
      setIsFollowing(!!follow);
      setLoading(false);
    })();
  }, [slug, user?.id]);

  // Realtime — keep follower count fresh
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`pub-artist-${profile.user_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_followers', filter: `artist_user_id=eq.${profile.user_id}` }, (payload) => {
        setFollowers((f) => f + (payload.eventType === 'INSERT' ? 1 : payload.eventType === 'DELETE' ? -1 : 0));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.user_id]);

  const toggleFollow = async () => {
    if (!user || !profile) { navigate('/auth'); return; }
    if (isFollowing) {
      const { error } = await supabase.from('artist_followers').delete().eq('artist_user_id', profile.user_id).eq('follower_user_id', user.id);
      if (error) { toast.error(error.message); return; }
      setIsFollowing(false);
    } else {
      const { error } = await supabase.from('artist_followers').insert({ artist_user_id: profile.user_id, follower_user_id: user.id });
      if (error) { toast.error(error.message); return; }
      setIsFollowing(true);
    }
  };

  const toPlayerSong = (s: Song): PlayerSong => ({
    id: `as_${s.id}`,
    title: s.title,
    artist: profile?.stage_name || 'Artist',
    cover_url: s.cover_url || undefined,
    audio_url: s.stream_url,
    duration: s.duration || undefined,
    artist_photo_url: profile?.avatar_url || undefined,
    source: 'indexed',
  });

  const playSong = async (s: Song, _idx: number) => {
    if (!player || !profile) return;
    const queue = songs.map(toPlayerSong);
    player.playSong(toPlayerSong(s), null, queue);
    // Increment play_count (best-effort)
    supabase.from('artist_songs').update({ play_count: (s.play_count || 0) + 1 }).eq('id', s.id);
  };

  if (loading) return <div className="min-h-[100dvh] bg-background" />;

  if (!profile) {
    return (
      <FadeTransition>
        <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-muted-foreground text-[14px] mb-4">Artist not found.</p>
            <Button onClick={() => navigate('/home')}>Back to home</Button>
          </div>
        </div>
      </FadeTransition>
    );
  }

  const ig = profile.social_links?.instagram;
  const yt = profile.social_links?.youtube;

  return (
    <FadeTransition>
      <SEOHead
        title={`${profile.stage_name} — Universflow`}
        description={profile.bio || `Listen to ${profile.stage_name} on Universflow.`}
        path={`/a/${profile.slug}`}
        ogImage={profile.avatar_url || undefined}
      />
      <div className="min-h-[100dvh] bg-background text-foreground pb-32">
        {/* Banner */}
        <div className="relative h-[200px] overflow-hidden">
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,45,85,0.4), rgba(16,16,18,0.95))' }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-md active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <main className="max-w-md mx-auto px-5 -mt-12 relative">
          {/* Hero */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-4">
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-black/60 border-2 border-background shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.stage_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Music2 className="w-8 h-8 text-muted-foreground" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1.5">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[22px] font-semibold truncate">{profile.stage_name}</h1>
                {profile.is_verified && (
                  <CheckCircle2 className="w-4.5 h-4.5 text-primary shrink-0" fill="currentColor" stroke="#fff" />
                )}
              </div>
              <p className="text-[12px] text-muted-foreground mt-0.5 tabular-nums">{fmt(followers)} followers</p>
            </div>
          </motion.section>

          {profile.bio && <p className="text-[13px] text-muted-foreground leading-relaxed mt-3">{profile.bio}</p>}

          <div className="flex gap-2.5 mt-4">
            <Button
              className="flex-1 h-10 rounded-full text-[13px] font-semibold"
              onClick={toggleFollow}
              style={{ background: isFollowing ? 'rgba(255,255,255,0.06)' : '#FF2D55', color: '#fff' }}
            >
              {isFollowing ? <><UserCheck className="w-4 h-4 mr-1.5" /> Following</> : <><UserPlus className="w-4 h-4 mr-1.5" /> Follow</>}
            </Button>
            {ig && <a href={ig} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center"><Instagram className="w-4 h-4" /></a>}
            {yt && <a href={yt} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center"><Youtube className="w-4 h-4" /></a>}
          </div>

          {/* Songs */}
          <section className="mt-7">
            <h2 className="text-[15px] font-semibold mb-3">Songs</h2>
            {songs.length === 0 && <p className="text-[13px] text-muted-foreground py-6 text-center">No songs yet.</p>}
            <div className="space-y-2">
              {songs.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => playSong(s, i)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] active:bg-white/[0.06] transition text-left"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 shrink-0">
                    {s.cover_url ? <img src={s.cover_url} alt={s.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-5 h-5 text-muted-foreground" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium truncate">{s.title}</p>
                    <p className="text-[11.5px] text-muted-foreground tabular-nums mt-0.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1"><Play className="w-3 h-3" />{fmt(s.play_count)}</span>
                      <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" />{fmt(s.like_count)}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    </FadeTransition>
  );
}
