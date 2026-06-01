import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { computeAura, getAuraByType, IDLE_AURA, type Aura } from '@/lib/aura';
import { toast } from 'sonner';

/**
 * Live Aura tile shown on the Profile page. Shows the user's current aura
 * derived from what they're playing, plus a Share button that copies a
 * public /aura/:userId link friends can watch in real-time.
 */
const ProfileAuraCard = ({ username }: { username: string }) => {
  const { user } = useAuth();
  const { currentSong, isPlaying } = usePlayer();
  const [copied, setCopied] = useState(false);
  const [serverAura, setServerAura] = useState<Aura | null>(null);

  // Pull last-known aura on mount (so it's correct even if nothing is playing).
  useEffect(() => {
    if (!user) return;
    supabase
      .from('listening_aura')
      .select('aura_type')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.aura_type) setServerAura(getAuraByType(data.aura_type));
      });
  }, [user?.id]);

  const liveAura: Aura =
    currentSong
      ? computeAura({
          title: currentSong.title,
          artist: currentSong.artist,
          mood: currentSong.mood,
          genre: currentSong.genre,
        })
      : serverAura || IDLE_AURA;

  const handleShare = async () => {
    if (!user) return;
    const url = `${window.location.origin}/aura/${user.id}`;
    const shareText = `My Listening Aura is ${liveAura.label} ${liveAura.emoji} — watch it live on Universflow`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Listening Aura', text: shareText, url });
        return;
      }
    } catch {/* user cancel */}
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Aura link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div
      className="rounded-2xl p-4 mb-4 overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${liveAura.color}22, rgba(28,28,30,0.85) 60%)`,
        border: `1px solid ${liveAura.color}40`,
      }}
    >
      {/* Pulsing aura orb */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: liveAura.color, filter: 'blur(14px)', opacity: 0.7 }}
            animate={isPlaying ? { scale: [1, 1.25, 1], opacity: [0.55, 0.9, 0.55] } : { scale: 1, opacity: 0.35 }}
            transition={{ duration: 2.4, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-1 rounded-full flex items-center justify-center text-2xl"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${liveAura.color}, ${liveAura.color}88 70%, ${liveAura.color}44)`,
              boxShadow: `inset 0 0 18px rgba(255,255,255,0.15), 0 0 22px ${liveAura.glow}`,
            }}
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 20, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
          >
            <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>{liveAura.emoji}</span>
          </motion.div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">
              Listening Aura {isPlaying && <span className="ml-1 text-green-400">● Live</span>}
            </span>
          </div>
          <h3 className="text-lg font-bold leading-tight mt-0.5" style={{ color: liveAura.color }}>
            {liveAura.label}
          </h3>
          <p className="text-[11px] text-muted-foreground truncate">
            {currentSong ? `${currentSong.title} — ${currentSong.artist}` : liveAura.description}
          </p>
        </div>

        <button
          onClick={handleShare}
          aria-label="Share aura link"
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4 text-white" />}
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/70 mt-3">
        Share your link — friends watch your aura change in real time as you listen.
      </p>
    </div>
  );
};

export default ProfileAuraCard;
