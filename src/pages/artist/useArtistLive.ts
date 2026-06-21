import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ArtistProfile, ArtistSong } from './artistShared';

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
          else if (payload.eventType === 'UPDATE') setSongs((c) => c.map((x) => x.id === (payload.new as ArtistSong).id ? payload.new as ArtistSong : x));
          else if (payload.eventType === 'DELETE') setSongs((c) => c.filter((x) => x.id !== (payload.old as { id: string }).id));
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
