import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

export type ArtistProfile = {
  id: string;
  user_id: string;
  stage_name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  social_links: Record<string, any> | null;
};

export type ArtistSong = {
  id: string;
  title: string;
  cover_url: string | null;
  stream_url: string;
  duration: number | null;
  play_count: number;
  like_count: number;
  download_count: number;
  view_count: number;
  status: 'live' | 'taken_down';
  takedown_reason?: string | null;
  created_at: string;
};

export function fmt(n: number) {
  if (n == null || isNaN(n as any)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export function StatCard({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden transition-shadow"
      style={{
        background: accent
          ? 'linear-gradient(160deg, rgba(255,45,85,0.18), rgba(16,16,18,0.6))'
          : 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        boxShadow: pulse
          ? '0 0 0 1px rgba(255,45,85,0.45), 0 8px 32px -8px rgba(255,45,85,0.35)'
          : undefined,
      }}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={value}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="mt-2 text-[22px] font-semibold tabular-nums leading-none"
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Live artist data hook — songs + followers + profile, with realtime updates. */
export function useArtistLive(userId: string | null) {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [songs, setSongs] = useState<ArtistSong[]>([]);
  const [followers, setFollowers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const [{ data: p }, { data: s }, { count }] = await Promise.all([
        supabase.from('artist_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('artist_songs').select('*').eq('artist_user_id', userId).order('created_at', { ascending: false }),
        supabase.from('artist_followers').select('id', { count: 'exact', head: true }).eq('artist_user_id', userId),
      ]);
      if (!alive) return;
      setProfile((p as ArtistProfile) ?? null);
      setSongs((s ?? []) as ArtistSong[]);
      setFollowers(count ?? 0);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`artist-live-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'artist_songs', filter: `artist_user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setSongs((c) => [payload.new as ArtistSong, ...c]);
          else if (payload.eventType === 'UPDATE') setSongs((c) => c.map((x) => x.id === (payload.new as any).id ? payload.new as ArtistSong : x));
          else if (payload.eventType === 'DELETE') setSongs((c) => c.filter((x) => x.id !== (payload.old as any).id));
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'artist_followers', filter: `artist_user_id=eq.${userId}` },
        (payload) => {
          setFollowers((f) => f + (payload.eventType === 'INSERT' ? 1 : payload.eventType === 'DELETE' ? -1 : 0));
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'artist_profiles', filter: `user_id=eq.${userId}` },
        (payload) => setProfile(payload.new as ArtistProfile))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return { profile, setProfile, songs, followers, loading };
}
