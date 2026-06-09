import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Headphones, Radio, Sparkles } from 'lucide-react';
import appLogo from '@/assets/app-logo.png';

interface Slide {
  icon: typeof Headphones;
  eyebrow: string;
  title: string;
  body: string;
  glow: string;
}

const SLIDES: Slide[] = [
  {
    icon: Headphones,
    eyebrow: 'Crystal sound',
    title: 'Built for the way you listen.',
    body: 'Studio-grade EQ, immersive 8D, late-night mode — sculpt every track the way it should feel.',
    glow: 'hsl(340 100% 55%)',
  },
  {
    icon: Radio,
    eyebrow: 'Endless catalog',
    title: 'Millions of songs. One quiet space.',
    body: 'Search worldwide, follow your favourite artists, and build playlists that travel with you offline.',
    glow: 'hsl(260 100% 60%)',
  },
  {
    icon: Sparkles,
    eyebrow: 'Yours from day one',
    title: 'A profile that already feels alive.',
    body: 'A handpicked animated avatar, your own username, and a vibe waiting to be saved.',
    glow: 'hsl(210 100% 60%)',
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = () => {
    try { localStorage.setItem('uf_onboarding_seen', '1'); } catch { /* ignore */ }
    navigate('/auth', { replace: true });
  };

  const next = () => {
    if (isLast) finish();
    else setIndex(i => Math.min(SLIDES.length - 1, i + 1));
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 && !isLast) setIndex(i => i + 1);
    else if (info.offset.x > 60 && index > 0) setIndex(i => i - 1);
  };

  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground flex flex-col overflow-hidden relative">
      {/* Single subtle halo behind the active slide — no rainbow clichés */}
      <motion.div
        key={`halo-${index}`}
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${slide.glow}30 0%, transparent 60%)`,
        }}
      />

      {/* Top bar: brand + skip */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-black ring-1 ring-white/10">
            <img src={appLogo} alt="" className="w-full h-full object-cover" />
          </div>
          <span className="text-[12px] tracking-[0.22em] uppercase font-semibold text-foreground/80">Universflow</span>
        </div>
        {!isLast && (
          <button
            onClick={finish}
            className="text-[12px] tracking-tight text-muted-foreground active:opacity-70 px-2 py-1"
          >
            Skip
          </button>
        )}
      </div>

      {/* Swipeable card */}
      <motion.div
        className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-6"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mx-auto max-w-md"
          >
            {/* Icon medallion */}
            <div className="mx-auto mb-7 relative" style={{ width: 96, height: 96 }}>
              <div
                className="absolute -inset-3 rounded-full"
                style={{ background: `radial-gradient(circle, ${slide.glow}55, transparent 70%)`, filter: 'blur(12px)' }}
              />
              <div
                className="relative w-full h-full rounded-[28px] flex items-center justify-center"
                style={{
                  background: 'rgba(20,20,22,0.9)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <Icon className="w-10 h-10" strokeWidth={1.5} style={{ color: slide.glow }} />
              </div>
            </div>

            <p className="text-[10.5px] tracking-[0.22em] uppercase font-semibold text-muted-foreground/80 mb-3">
              {slide.eyebrow}
            </p>
            <h1 className="text-[28px] leading-[1.12] font-display tracking-tight text-foreground px-2">
              {slide.title}
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground px-4">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-1.5 mt-9 mb-7">
          {SLIDES.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className="h-1.5 rounded-full transition-colors"
              animate={{ width: i === index ? 22 : 6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              style={{ background: i === index ? '#FF2D55' : 'rgba(255,255,255,0.18)' }}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.button
          onClick={next}
          whileTap={{ scale: 0.97 }}
          className="w-full h-13 rounded-2xl text-[15px] font-semibold text-white flex items-center justify-center gap-2"
          style={{
            height: 52,
            background: 'linear-gradient(180deg, #FF3B5C 0%, #E11D48 100%)',
            boxShadow: '0 10px 30px hsl(340 100% 45% / 0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          {isLast ? 'Get started' : 'Continue'}
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        <p className="text-center text-[10.5px] text-muted-foreground/60 mt-3 tracking-tight">
          By continuing you agree to our Terms and Privacy.
        </p>
      </motion.div>
    </div>
  );
};

export default Onboarding;
