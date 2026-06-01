import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAuraByType, IDLE_AURA, type Aura } from '@/lib/aura';

interface AuraRow {
  aura_type: string;
  aura_label: string;
  aura_color: string;
  song_title: string | null;
  song_artist: string | null;
  song_cover: string | null;
  is_playing: boolean;
  updated_at: string;
}

interface ProfileRow {
  username: string | null;
}

const AuraPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [aura, setAura] = useState<Aura>(IDLE_AURA);
  const [row, setRow] = useState<AuraRow | null>(null);
  const [username, setUsername] = useState<string>('Someone');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const apply = (data: AuraRow | null) => {
      if (cancelled) return;
      setRow(data);
      setAura(data ? getAuraByType(data.aura_type) : IDLE_AURA);
    };

    (async () => {
      const [auraRes, profRes] = await Promise.all([
        supabase.from('listening_aura').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('username').eq('user_id', userId).maybeSingle(),
      ]);
      apply((auraRes.data as AuraRow) || null);
      const prof = profRes.data as ProfileRow | null;
      if (prof?.username) setUsername(prof.username);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`aura:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listening_aura', filter: `user_id=eq.${userId}` },
        (payload) => apply((payload.new as AuraRow) || null),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const isLive = !!row?.is_playing;

  return (
    <div
      className="h-[100dvh] w-full flex flex-col items-center overflow-hidden relative"
      style={{
        background: `radial-gradient(circle at 50% 30%, ${aura.color}33, #000 70%)`,
      }}
    >
      {/* Background pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${aura.color}55, transparent 60%)`,
        }}
        animate={isLive ? { opacity: [0.4, 0.85, 0.4] } : { opacity: 0.3 }}
        transition={{ duration: 3.2, repeat: isLive ? Infinity : 0, ease: 'easeInOut' }}
      />

      <header className="relative z-10 w-full flex items-center justify-between px-4 pt-4 safe-area-pt">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <span className="text-xs uppercase tracking-widest text-white/60">Listening Aura</span>
        <div className="w-10" />
      </header>

      <main className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-6 text-center">
        {loading ? (
          <div className="text-white/60 text-sm">Tuning in…</div>
        ) : (
          <>
            <p className="text-sm text-white/70 mb-6">
              @{username}{isLive ? ' is listening to' : ' was last in a'}…
            </p>

            <div className="relative w-56 h-56 mb-8">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: aura.color, filter: 'blur(40px)' }}
                animate={isLive ? { scale: [1, 1.18, 1], opacity: [0.6, 0.95, 0.6] } : { scale: 1, opacity: 0.35 }}
                transition={{ duration: 2.6, repeat: isLive ? Infinity : 0, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-4 rounded-full flex items-center justify-center text-7xl"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${aura.color}, ${aura.color}99 60%, ${aura.color}44)`,
                  boxShadow: `inset 0 0 60px rgba(255,255,255,0.18), 0 0 60px ${aura.glow}`,
                }}
                animate={isLive ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 24, repeat: isLive ? Infinity : 0, ease: 'linear' }}
              >
                <span style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>{aura.emoji}</span>
              </motion.div>
            </div>

            <h1 className="text-5xl font-black mb-2" style={{ color: aura.color, textShadow: `0 0 30px ${aura.glow}` }}>
              {aura.label}
            </h1>
            <p className="text-sm text-white/70 mb-8 max-w-xs">{aura.description}</p>

            {row?.song_title && (
              <div
                className="w-full max-w-sm rounded-2xl p-3 flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center">
                  {row.song_cover ? (
                    <img src={row.song_cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-5 h-5 text-white/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-white truncate">{row.song_title}</p>
                  <p className="text-xs text-white/60 truncate">{row.song_artist}</p>
                </div>
                {isLive && (
                  <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => navigate('/home')}
              className="mt-10 px-6 py-3 rounded-full text-sm font-semibold text-white"
              style={{ background: aura.color, boxShadow: `0 8px 30px ${aura.glow}` }}
            >
              Open Universflow
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default AuraPage;
