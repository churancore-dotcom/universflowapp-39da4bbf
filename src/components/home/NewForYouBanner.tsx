import { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlayer, type Song } from '@/contexts/PlayerContext';
import { triggerHaptic } from '@/hooks/useHaptics';

/**
 * "New For You" — wide banner highlighting the freshest admin upload.
 * Pulls the latest visible song; tap to play.
 */
function NewForYouBannerComponent() {
  const [song, setSong] = useState<Song | null>(null);
  const { playSong } = usePlayer();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('songs')
        .select('id, title, artist, album, cover_url, audio_url, duration, artist_id, artists(photo_url)')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      const a = (data as any).artists as { photo_url: string | null } | null;
      setSong({
        id: data.id, title: data.title, artist: data.artist,
        album: data.album || undefined, cover_url: data.cover_url || undefined,
        audio_url: data.audio_url, duration: data.duration || undefined,
        artist_id: data.artist_id || undefined,
        artist_photo_url: a?.photo_url || undefined,
      } as Song);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!song) return null;

  return (
    <section className="space-y-2.5">
      <h2 className="text-[20px] font-extrabold tracking-tight px-1">New For You</h2>
      <motion.button
        onClick={() => { triggerHaptic('selection'); playSong(song, undefined, [song]); }}
        whileTap={{ scale: 0.98 }}
        className="relative w-full h-[150px] rounded-2xl overflow-hidden text-left"
        style={{
          background: 'linear-gradient(135deg, hsl(280 70% 35%), hsl(260 65% 25%))',
        }}
      >
        {/* Left: cover art */}
        {song.cover_url && (
          <img
            src={song.cover_url}
            alt=""
            className="absolute left-0 top-0 h-full w-[150px] object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        {/* Right: artist photo + text */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-end max-w-[55%]">
          {song.artist_photo_url && (
            <img
              src={song.artist_photo_url}
              alt={song.artist}
              className="w-10 h-10 rounded-full object-cover mb-1.5 border border-white/30"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}
          <p className="text-white/80 text-[10px] font-bold tracking-[0.18em] uppercase">New Release</p>
          <p className="text-white text-[20px] font-extrabold leading-[1.05] line-clamp-2 text-right drop-shadow">
            {song.title}
          </p>
          <p className="text-white/85 text-[11px] font-semibold mt-0.5 truncate">By {song.artist}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-[11px] font-extrabold">
            <Play className="w-3 h-3" fill="currentColor" />
            EXPLORE NOW
          </div>
        </div>
      </motion.button>
    </section>
  );
}

const NewForYouBanner = memo(NewForYouBannerComponent);
NewForYouBanner.displayName = 'NewForYouBanner';
export default NewForYouBanner;
