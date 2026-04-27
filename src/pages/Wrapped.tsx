import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Share2, Music2, Headphones, Crown,
  Sparkles, Clock, Disc3, Mic2, Loader2, Download as DownloadIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PageTransition from '@/components/PageTransition';
import { toast } from 'sonner';

const YEAR = 2026;
const YEAR_START = `${YEAR}-01-01T00:00:00Z`;
const YEAR_END = `${YEAR + 1}-01-01T00:00:00Z`;

interface PlayRow {
  played_at: string;
  songs: {
    id: string;
    title: string;
    artist: string;
    cover_url: string | null;
    duration: number | null;
    genre: string | null;
  } | null;
}

interface WrappedData {
  totalPlays: number;
  totalMinutes: number;
  uniqueSongs: number;
  uniqueArtists: number;
  topSongs: { title: string; artist: string; cover_url: string | null; plays: number }[];
  topArtists: { artist: string; plays: number; cover_url: string | null }[];
  topGenre: string | null;
  topHour: number;
  firstSong: { title: string; artist: string; played_at: string } | null;
  daysListened: number;
}

const Wrapped = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WrappedData | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    void loadWrapped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadWrapped = async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('recently_played')
        .select('played_at, songs:song_id(id, title, artist, cover_url, duration, genre)')
        .eq('user_id', user!.id)
        .gte('played_at', YEAR_START)
        .lt('played_at', YEAR_END)
        .order('played_at', { ascending: true })
        .limit(5000);

      if (error) throw error;
      const plays = (rows as unknown as PlayRow[]) || [];
      setData(aggregate(plays));
    } catch (e) {
      console.error(e);
      toast.error('Could not load your Wrapped');
    } finally {
      setLoading(false);
    }
  };

  const slides = useMemo(() => buildSlides(data), [data]);
  const totalSteps = slides.length;

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Crafting your {YEAR} Rewind…</p>
        </div>
      </PageTransition>
    );
  }

  if (!data || data.totalPlays === 0) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 flex items-center gap-1 text-primary"
          >
            <ChevronLeft className="w-6 h-6" />
            <span>Back</span>
          </button>
          <div className="w-20 h-20 rounded-3xl mb-5 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}>
            <Disc3 className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">No Rewind yet</h1>
          <p className="text-muted-foreground max-w-xs">
            Listen to some music in {YEAR} and come back to see your personalized Rewind.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 rounded-2xl font-semibold bg-primary text-primary-foreground"
          >
            Discover music
          </button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="fixed inset-0 z-50 bg-black overflow-hidden">
        {/* Progress dots */}
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1.5 safe-area-pt">
          {slides.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: i < step ? '100%' : '0%' }}
                animate={{ width: i <= step ? '100%' : '0%' }}
                transition={{ duration: i === step ? 5 : 0.3, ease: 'linear' }}
                onAnimationComplete={() => { if (i === step && step < totalSteps - 1) next(); }}
              />
            </div>
          ))}
        </div>

        {/* Close */}
        <button
          onClick={() => navigate('/profile')}
          className="absolute top-8 right-4 z-20 w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Slide */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {slides[step]}
          </motion.div>
        </AnimatePresence>

        {/* Tap zones */}
        <button
          onClick={prev}
          className="absolute left-0 top-12 bottom-20 w-1/3 z-10"
          aria-label="Previous"
        />
        <button
          onClick={next}
          className="absolute right-0 top-12 bottom-20 w-1/3 z-10"
          aria-label="Next"
        />

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 safe-area-pb flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent pt-10">
          <button
            onClick={prev}
            disabled={step === 0}
            className="w-11 h-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <ShareButton data={data} step={step} />

          <button
            onClick={next}
            disabled={step === totalSteps - 1}
            className="w-11 h-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </PageTransition>
  );
};

// ───────────────────────────── Aggregation ─────────────────────────────

function aggregate(plays: PlayRow[]): WrappedData {
  const songMap = new Map<string, { title: string; artist: string; cover_url: string | null; plays: number }>();
  const artistMap = new Map<string, { plays: number; cover_url: string | null }>();
  const genreMap = new Map<string, number>();
  const hourBuckets = new Array(24).fill(0);
  const days = new Set<string>();
  let totalDuration = 0;

  for (const p of plays) {
    const s = p.songs;
    if (!s) continue;
    const key = `${s.title}::${s.artist}`;
    const cur = songMap.get(key);
    if (cur) cur.plays += 1;
    else songMap.set(key, { title: s.title, artist: s.artist, cover_url: s.cover_url, plays: 1 });

    const a = artistMap.get(s.artist);
    if (a) a.plays += 1;
    else artistMap.set(s.artist, { plays: 1, cover_url: s.cover_url });

    if (s.genre) genreMap.set(s.genre, (genreMap.get(s.genre) || 0) + 1);
    if (s.duration) totalDuration += s.duration;

    const d = new Date(p.played_at);
    hourBuckets[d.getHours()] += 1;
    days.add(d.toISOString().slice(0, 10));
  }

  const topSongs = Array.from(songMap.values()).sort((a, b) => b.plays - a.plays).slice(0, 5);
  const topArtists = Array.from(artistMap.entries())
    .map(([artist, v]) => ({ artist, plays: v.plays, cover_url: v.cover_url }))
    .sort((a, b) => b.plays - a.plays).slice(0, 5);
  const topGenre = Array.from(genreMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const topHour = hourBuckets.indexOf(Math.max(...hourBuckets));
  const first = plays.find((p) => p.songs);

  return {
    totalPlays: plays.length,
    totalMinutes: Math.round(totalDuration / 60),
    uniqueSongs: songMap.size,
    uniqueArtists: artistMap.size,
    topSongs,
    topArtists,
    topGenre,
    topHour,
    firstSong: first?.songs ? { title: first.songs.title, artist: first.songs.artist, played_at: first.played_at } : null,
    daysListened: days.size,
  };
}

// ───────────────────────────── Slides ─────────────────────────────

function buildSlides(data: WrappedData | null) {
  if (!data) return [];
  return [
    <Intro key="intro" />,
    <StatSlide key="plays" gradient="from-pink-500 via-rose-500 to-orange-500"
      icon={<Headphones className="w-10 h-10 text-white" />}
      label="You played"
      value={data.totalPlays.toLocaleString()}
      suffix="songs"
      caption={`Across ${data.daysListened} days of pure vibes`} />,
    <StatSlide key="minutes" gradient="from-violet-600 via-purple-600 to-indigo-600"
      icon={<Clock className="w-10 h-10 text-white" />}
      label="That's"
      value={data.totalMinutes.toLocaleString()}
      suffix="minutes"
      caption={data.totalMinutes > 60 ? `${Math.round(data.totalMinutes / 60)} hours of music` : 'of pure music'} />,
    <TopSongsSlide key="top-songs" songs={data.topSongs} />,
    <TopArtistsSlide key="top-artists" artists={data.topArtists} />,
    <StatSlide key="genre" gradient="from-emerald-500 via-teal-500 to-cyan-500"
      icon={<Sparkles className="w-10 h-10 text-white" />}
      label="Your top genre"
      value={data.topGenre || 'Eclectic'}
      caption={data.topGenre ? `You couldn't get enough` : 'You love it all'} />,
    <StatSlide key="hour" gradient="from-amber-500 via-orange-500 to-red-500"
      icon={<Disc3 className="w-10 h-10 text-white" />}
      label="Peak listening hour"
      value={formatHour(data.topHour)}
      caption={hourMood(data.topHour)} />,
    <Outro key="outro" data={data} />,
  ];
}

function formatHour(h: number) {
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${am ? 'AM' : 'PM'}`;
}
function hourMood(h: number) {
  if (h < 6) return 'A true night owl 🌙';
  if (h < 12) return 'Morning energy ☀️';
  if (h < 18) return 'Afternoon flow 🎧';
  if (h < 22) return 'Evening vibes 🌆';
  return 'Late night sessions 🌙';
}

// ───────────────────────────── Slide components ─────────────────────────────

const Intro = () => (
  <div className="relative w-full h-full flex flex-col items-center justify-center px-8 text-center"
    style={{ background: 'radial-gradient(circle at 30% 20%, #ff2d55 0%, #8b00ff 50%, #000 100%)' }}>
    <FloatingBlobs />
    <motion.div
      initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', damping: 12, stiffness: 100 }}
      className="w-24 h-24 rounded-3xl mb-6 flex items-center justify-center bg-white/15 backdrop-blur-xl"
    >
      <Disc3 className="w-14 h-14 text-white" />
    </motion.div>
    <motion.p
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="text-white/80 text-sm tracking-[0.3em] uppercase mb-2"
    >Universflow</motion.p>
    <motion.h1
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="text-5xl font-black text-white drop-shadow-2xl"
    >Rewind</motion.h1>
    <motion.p
      initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, type: 'spring' }}
      className="text-7xl font-black text-white mt-2"
      style={{ background: 'linear-gradient(180deg,#fff,#ffd6e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
    >{YEAR}</motion.p>
    <motion.p
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      className="text-white/70 mt-8 text-sm"
    >Tap to continue →</motion.p>
  </div>
);

const StatSlide = ({ gradient, icon, label, value, suffix, caption }: {
  gradient: string; icon: React.ReactNode; label: string; value: string; suffix?: string; caption?: string;
}) => (
  <div className={`relative w-full h-full flex flex-col items-center justify-center px-8 text-center bg-gradient-to-br ${gradient}`}>
    <FloatingBlobs />
    <motion.div
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 10 }}
      className="w-20 h-20 rounded-3xl mb-6 flex items-center justify-center bg-white/20 backdrop-blur-xl"
    >{icon}</motion.div>
    <motion.p
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="text-white/85 text-base font-medium uppercase tracking-widest mb-3"
    >{label}</motion.p>
    <motion.h2
      initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.35, type: 'spring', damping: 11 }}
      className="text-7xl font-black text-white drop-shadow-2xl leading-none"
    >{value}</motion.h2>
    {suffix && (
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-2xl font-bold text-white/90 mt-2"
      >{suffix}</motion.p>
    )}
    {caption && (
      <motion.p
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="text-white/80 text-sm mt-6 max-w-xs"
      >{caption}</motion.p>
    )}
  </div>
);

const TopSongsSlide = ({ songs }: { songs: WrappedData['topSongs'] }) => (
  <div className="relative w-full h-full flex flex-col px-6 pt-20 pb-32"
    style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #831843 50%, #4c1d95 100%)' }}>
    <FloatingBlobs />
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="text-center mb-6"
    >
      <Music2 className="w-9 h-9 text-white mx-auto mb-2" />
      <p className="text-white/70 text-xs uppercase tracking-[0.3em]">Your top songs</p>
      <h2 className="text-3xl font-black text-white mt-1">On Repeat</h2>
    </motion.div>
    <div className="flex-1 space-y-2.5 overflow-y-auto">
      {songs.map((s, i) => (
        <motion.div
          key={s.title + s.artist}
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.1 }}
          className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/10 backdrop-blur-md"
        >
          <span className="text-3xl font-black text-white/40 w-8 text-center">#{i + 1}</span>
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
            {s.cover_url ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" /> :
              <div className="w-full h-full flex items-center justify-center"><Music2 className="w-5 h-5 text-white/50" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{s.title}</p>
            <p className="text-white/60 text-xs truncate">{s.artist}</p>
          </div>
          <span className="text-white/50 text-xs font-medium">{s.plays}×</span>
        </motion.div>
      ))}
    </div>
  </div>
);

const TopArtistsSlide = ({ artists }: { artists: WrappedData['topArtists'] }) => (
  <div className="relative w-full h-full flex flex-col px-6 pt-20 pb-32"
    style={{ background: 'linear-gradient(160deg, #0c4a6e 0%, #134e4a 50%, #052e16 100%)' }}>
    <FloatingBlobs />
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="text-center mb-6"
    >
      <Mic2 className="w-9 h-9 text-white mx-auto mb-2" />
      <p className="text-white/70 text-xs uppercase tracking-[0.3em]">Your top artists</p>
      <h2 className="text-3xl font-black text-white mt-1">The Voices of {YEAR}</h2>
    </motion.div>
    <div className="flex-1 space-y-2.5 overflow-y-auto">
      {artists.map((a, i) => (
        <motion.div
          key={a.artist}
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.1 }}
          className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/10 backdrop-blur-md"
        >
          <span className="text-3xl font-black text-white/40 w-8 text-center">#{i + 1}</span>
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
            {a.cover_url ? <img src={a.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" /> :
              <div className="w-full h-full flex items-center justify-center"><Mic2 className="w-5 h-5 text-white/50" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{a.artist}</p>
            <p className="text-white/60 text-xs">{a.plays} plays</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const Outro = ({ data }: { data: WrappedData }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center px-6 text-center"
    style={{ background: 'radial-gradient(circle at 70% 80%, #fbbf24 0%, #ec4899 50%, #1e1b4b 100%)' }}>
    <FloatingBlobs />
    <motion.div
      initial={{ scale: 0, rotate: 180 }} animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', damping: 10 }}
      className="w-20 h-20 rounded-3xl mb-6 flex items-center justify-center bg-white/20 backdrop-blur-xl"
    ><Crown className="w-10 h-10 text-white" /></motion.div>

    <motion.h2
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="text-4xl font-black text-white mb-2"
    >That's a wrap.</motion.h2>
    <motion.p
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
      className="text-white/80 max-w-xs"
    >Thanks for soundtracking your year with Universflow 💜</motion.p>

    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
      className="grid grid-cols-2 gap-3 mt-8 w-full max-w-xs"
    >
      <Stat label="Songs" value={data.totalPlays.toLocaleString()} />
      <Stat label="Minutes" value={data.totalMinutes.toLocaleString()} />
      <Stat label="Artists" value={String(data.uniqueArtists)} />
      <Stat label="Tracks" value={String(data.uniqueSongs)} />
    </motion.div>

    <motion.p
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      className="text-white/60 text-xs mt-8"
    >Tap share below to flex your year ✨</motion.p>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-white/15 backdrop-blur-md p-3">
    <p className="text-white text-2xl font-black">{value}</p>
    <p className="text-white/70 text-[10px] uppercase tracking-wider mt-1">{label}</p>
  </div>
);

const FloatingBlobs = () => (
  <>
    <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
    <div className="absolute -bottom-20 -right-10 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
  </>
);

// ───────────────────────────── Share ─────────────────────────────

const ShareButton = ({ data, step }: { data: WrappedData; step: number }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);

  const buildCard = async (): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    grad.addColorStop(0, '#ff2d55');
    grad.addColorStop(0.5, '#8b00ff');
    grad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1920);

    // Brand
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 36px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('UNIVERSFLOW REWIND', 540, 200);

    ctx.fillStyle = '#fff';
    ctx.font = '900 220px -apple-system, system-ui, sans-serif';
    ctx.fillText(String(YEAR), 540, 460);

    // Top song
    if (data.topSongs[0]) {
      ctx.font = '500 32px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('MY #1 SONG', 540, 640);
      ctx.font = '800 64px system-ui'; ctx.fillStyle = '#fff';
      wrapText(ctx, data.topSongs[0].title, 540, 720, 900, 70);
      ctx.font = '500 40px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(data.topSongs[0].artist, 540, 880);
    }

    // Stats grid
    const stats = [
      { label: 'SONGS', value: data.totalPlays.toLocaleString() },
      { label: 'MINUTES', value: data.totalMinutes.toLocaleString() },
      { label: 'ARTISTS', value: String(data.uniqueArtists) },
      { label: 'GENRE', value: (data.topGenre || 'MIXED').toUpperCase().slice(0, 10) },
    ];
    stats.forEach((s, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 180 + col * 380, y = 1080 + row * 280;
      // Card
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      roundRect(ctx, x, y, 340, 230, 32); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 80px system-ui';
      ctx.fillText(s.value, x + 170, y + 110);
      ctx.font = '600 26px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(s.label, x + 170, y + 170);
    });

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '500 28px system-ui';
    ctx.fillText('universflow.in', 540, 1820);

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.95));
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await buildCard();
      if (!blob) throw new Error('Could not generate card');
      const file = new File([blob], `universflow-rewind-${YEAR}.png`, { type: 'image/png' });

      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `My Universflow Rewind ${YEAR}`,
          text: `My ${YEAR} in music 🎵 Listen on Universflow`,
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `universflow-rewind-${YEAR}.png`; a.click();
        URL.revokeObjectURL(url);
        toast.success('Card downloaded — share it anywhere!');
      }
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name !== 'AbortError') toast.error('Could not share');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={busy}
      className="flex-1 mx-2 h-11 rounded-full bg-white text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
      {busy ? 'Building card…' : 'Share my Rewind'}
      <canvas ref={canvasRef} className="hidden" />
    </button>
  );
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' '); let line = ''; let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy); line = w; yy += lineHeight;
    } else { line = test; }
  }
  ctx.fillText(line, x, yy);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default Wrapped;
