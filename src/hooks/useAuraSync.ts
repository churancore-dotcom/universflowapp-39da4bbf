import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { computeAura, IDLE_AURA } from '@/lib/aura';

/**
 * Live-syncs the current user's "Listening Aura" to the public
 * `listening_aura` table whenever the playing song or play state changes.
 * Friends viewing /aura/:userId see this update in realtime.
 */
export function useAuraSync() {
  const { user } = useAuth();
  const { currentSong, isPlaying } = usePlayer();
  const lastKey = useRef<string>('');

  useEffect(() => {
    if (!user) return;

    const aura = currentSong
      ? computeAura({
          title: currentSong.title,
          artist: currentSong.artist,
          mood: currentSong.mood,
          genre: currentSong.genre,
        })
      : IDLE_AURA;

    const key = `${aura.type}|${currentSong?.id || ''}|${isPlaying ? 1 : 0}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    const payload = {
      user_id: user.id,
      aura_type: aura.type,
      aura_label: aura.label,
      aura_color: aura.color,
      song_title: currentSong?.title ?? null,
      song_artist: currentSong?.artist ?? null,
      song_cover: currentSong?.cover_url ?? null,
      is_playing: !!currentSong && isPlaying,
      updated_at: new Date().toISOString(),
    };

    // Debounce burst updates (skip, scrub) by 800ms
    const t = setTimeout(() => {
      supabase.from('listening_aura').upsert(payload, { onConflict: 'user_id' }).then(() => {});
    }, 800);

    return () => clearTimeout(t);
  }, [user?.id, currentSong?.id, isPlaying]);
}
