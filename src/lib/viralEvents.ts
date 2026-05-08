import { supabase } from '@/integrations/supabase/client';
import type { Song } from '@/contexts/PlayerContext';
import { getGeo } from '@/lib/geoLocation';
import { isCatalogSongId } from '@/lib/songSupport';

export type ViralAction = 'stream' | 'save' | 'share' | 'playlist_add' | 'skip';

const ACTION_WEIGHT: Record<ViralAction, number> = {
  stream: 3,
  save: 5,
  share: 10,
  playlist_add: 4,
  skip: -2,
};

const sessionId = (() => {
  try {
    const key = 'uf_session_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch {
    return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
})();

export async function recordViralEvent(song: Song | null | undefined, action: ViralAction) {
  if (!song?.id || !song.title || !song.artist) return;

  try {
    const [{ data: userData }, geo] = await Promise.all([
      supabase.auth.getUser(),
      getGeo(),
    ]);

    await supabase.from('song_play_events').insert({
      user_id: userData.user?.id ?? null,
      session_id: sessionId,
      track_id: song.id,
      song_id: isCatalogSongId(song.id) ? song.id : null,
      title: song.title,
      artist: song.artist,
      cover_url: song.cover_url ?? null,
      source: song.source || (isCatalogSongId(song.id) ? 'library' : 'indexed'),
      country_code: geo?.country_code || null,
      country_name: geo?.country_name || null,
      city: geo?.city || null,
      action,
      score_weight: ACTION_WEIGHT[action],
    });
  } catch (error) {
    console.warn('[viral] event skipped', error);
  }
}

export async function loadLiveViralTracks(options: { countryCode?: string; city?: string; limit?: number; sinceHours?: number }) {
  const { data, error } = await supabase.rpc('get_viral_song_events', {
    p_country_code: options.countryCode || null,
    p_city: options.city || null,
    p_limit: options.limit || 30,
    p_since_hours: options.sinceHours || 24,
  });

  if (error || !data) return [];

  return data.map((row, index) => ({
    id: row.track_id,
    title: row.title,
    artist: row.artist,
    cover_url: row.cover_url || undefined,
    rank: index + 1,
    listeners: Number(row.score || 0),
    source: row.source,
  }));
}