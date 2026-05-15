import { useEffect, useState } from 'react';

/**
 * Animated radial glows + subtle parallax for color-rich themes.
 * Renders only for sunset / ocean / crimson / midnight-gold so the
 * minimal Obsidian / Pearl / Onyx themes stay flat & fast.
 */
const ACTIVE_THEMES = new Set(['sunset', 'ocean', 'crimson', 'midnight-gold']);

const readTheme = () =>
  (typeof document !== 'undefined' && document.documentElement.dataset.theme) ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('uf_theme')) ||
  'default';

const ThemeAura = () => {
  const [theme, setTheme] = useState<string>(readTheme);
  const [scrollY, setScrollY] = useState(0);

  // Listen for theme attr changes (set by applyTheme)
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const onStorage = () => setTheme(readTheme());
    window.addEventListener('storage', onStorage);
    return () => {
      obs.disconnect();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Subtle parallax tied to scroll of the MobileShell scroll container
  useEffect(() => {
    if (!ACTIVE_THEMES.has(theme)) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = document.scrollingElement || document.documentElement;
      // shell is fixed; capture closest scrollable parent of body
      const shell = document.querySelector<HTMLElement>('[data-mobile-shell]');
      const y = shell ? shell.scrollTop : el.scrollTop;
      setScrollY(y);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };
    const shell = document.querySelector<HTMLElement>('[data-mobile-shell]');
    const target: any = shell || window;
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [theme]);

  if (!ACTIVE_THEMES.has(theme)) return null;

  // Parallax offsets (very subtle — keep mobile-perf budget)
  const p1 = scrollY * 0.12;
  const p2 = scrollY * -0.18;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ contain: 'strict' }}
    >
      {/* Top-left primary glow — slow drift */}
      <div
        className="absolute aura-blob aura-blob-1"
        style={{
          top: `${-160 + p1}px`,
          left: '-120px',
          width: '520px',
          height: '520px',
          background:
            'radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.55), hsl(var(--primary) / 0) 65%)',
          filter: 'blur(80px)',
          willChange: 'transform, opacity',
        }}
      />
      {/* Bottom-right accent glow — slow drift opposite */}
      <div
        className="absolute aura-blob aura-blob-2"
        style={{
          bottom: `${-180 + p2}px`,
          right: '-140px',
          width: '560px',
          height: '560px',
          background:
            'radial-gradient(circle at 70% 70%, hsl(var(--accent) / 0.45), hsl(var(--accent) / 0) 65%)',
          filter: 'blur(90px)',
          willChange: 'transform, opacity',
        }}
      />
      {/* Center pulse — extra heartbeat */}
      <div
        className="absolute aura-blob aura-blob-3"
        style={{
          top: '40%',
          left: '50%',
          width: '420px',
          height: '420px',
          marginLeft: '-210px',
          marginTop: '-210px',
          background:
            'radial-gradient(circle, hsl(var(--primary) / 0.25), hsl(var(--accent) / 0.12) 50%, transparent 70%)',
          filter: 'blur(70px)',
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );
};

export default ThemeAura;
