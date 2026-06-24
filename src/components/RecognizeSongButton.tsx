import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, X, Play, Music2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type Match = {
  title: string | null;
  artist: string | null;
  album: string | null;
  cover: string | null;
  songLink: string | null;
};

type Phase = 'idle' | 'recording' | 'processing' | 'result' | 'error';

const RECORD_MS = 6000;

const RecognizeSongButton = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RECORD_MS / 1000);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const cleanup = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* ignore */ }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  };

  useEffect(() => cleanup, []);

  const close = () => {
    cleanup();
    setPhase('idle');
    setMatch(null);
    setError(null);
    setSecondsLeft(RECORD_MS / 1000);
  };

  const start = async () => {
    setError(null); setMatch(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase('error');
      setError('Microphone access denied. Please allow microphone permission and try again.');
      return;
    }
    const mimeType = ['audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) {
      stream.getTracks().forEach((t) => t.stop());
      setPhase('error');
      setError('Your browser cannot record audio in a supported format.');
      return;
    }
    streamRef.current = stream;
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream, { mimeType });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const blob = new Blob(chunks, { type: rec.mimeType });
      if (blob.size < 2048) {
        setPhase('error');
        setError('Recording was empty. Make sure music is playing nearby and try again.');
        return;
      }
      setPhase('processing');
      try {
        const fd = new FormData();
        fd.append('file', blob, `sample.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`);
        const { data, error: fnErr } = await supabase.functions.invoke('recognize-song', { body: fd });
        if (fnErr) throw fnErr;
        const m = (data as { match: Match | null; error?: string } | null);
        if (m?.error) { setPhase('error'); setError(m.error); return; }
        if (!m?.match) {
          setPhase('error');
          setError("Couldn't recognize that song. Try moving closer to the speaker.");
          return;
        }
        setMatch(m.match);
        setPhase('result');
      } catch (err) {
        setPhase('error');
        setError((err as Error).message || 'Recognition failed. Please try again.');
      }
    };
    rec.start();
    setPhase('recording');
    setSecondsLeft(RECORD_MS / 1000);
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((RECORD_MS - (Date.now() - startedAt)) / 1000));
      setSecondsLeft(remain);
      if (remain <= 0) {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        try { rec.stop(); } catch { /* ignore */ }
      }
    }, 200);
  };

  const playMatch = () => {
    if (!match?.title) return;
    const q = [match.artist, match.title].filter(Boolean).join(' ');
    close();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <motion.button
        onClick={start}
        whileTap={{ scale: 0.94 }}
        aria-label="Identify the song playing around you"
        className="flex-shrink-0 h-12 w-12 rounded-3xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(18 100% 82%))',
          boxShadow: '0 4px 14px hsl(var(--primary) / 0.35)',
        }}
      >
        <Mic className="w-5 h-5" style={{ color: 'hsl(var(--background))' }} />
      </motion.button>

      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(14px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          >
            <motion.div
              initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="w-full max-w-md mx-3 mb-3 rounded-3xl p-6 safe-area-pb"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">
                  {phase === 'recording' && 'Listening…'}
                  {phase === 'processing' && 'Identifying…'}
                  {phase === 'result' && 'Song found'}
                  {phase === 'error' && 'No match'}
                </h2>
                <button onClick={close} aria-label="Close" className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {phase === 'recording' && (
                <div className="flex flex-col items-center py-6">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(18 100% 82%))' }}
                  >
                    <Mic className="w-10 h-10" style={{ color: 'hsl(var(--background))' }} />
                  </motion.div>
                  <p className="mt-5 text-sm text-muted-foreground">
                    Hold near the speaker · {secondsLeft}s left
                  </p>
                </div>
              )}

              {phase === 'processing' && (
                <div className="flex flex-col items-center py-10">
                  <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                  <p className="mt-4 text-sm text-muted-foreground">Matching the fingerprint…</p>
                </div>
              )}

              {phase === 'result' && match && (
                <div className="flex flex-col items-center text-center">
                  {match.cover ? (
                    <img src={match.cover} alt={match.title ?? ''} className="w-32 h-32 rounded-2xl object-cover mb-4" />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl mb-4 flex items-center justify-center" style={{ background: 'hsl(var(--muted))' }}>
                      <Music2 className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <h3 className="text-xl font-bold">{match.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{match.artist}</p>
                  {match.album && <p className="text-xs text-muted-foreground mt-0.5 opacity-70">{match.album}</p>}
                  <motion.button
                    onClick={playMatch}
                    whileTap={{ scale: 0.96 }}
                    className="mt-6 w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(18 100% 82%))',
                      color: 'hsl(var(--background))',
                    }}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Play this song
                  </motion.button>
                </div>
              )}

              {phase === 'error' && (
                <div className="flex flex-col items-center text-center py-4">
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <motion.button
                    onClick={start}
                    whileTap={{ scale: 0.96 }}
                    className="mt-5 px-5 h-11 rounded-2xl font-bold text-sm"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(18 100% 82%))',
                      color: 'hsl(var(--background))',
                    }}
                  >
                    Try again
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RecognizeSongButton;
