// Applies the saved theme tokens to :root BEFORE React mounts.
// This guarantees the theme persists across reloads and is consistent
// across every page (not just Settings).

type ThemeMode = 'default' | 'light' | 'black' | 'sunset' | 'ocean' | 'midnight-gold';

interface ThemeTokens {
  background: string; foreground: string;
  card: string; cardForeground: string;
  muted: string; mutedForeground: string;
  popover: string; popoverForeground: string;
  secondary: string; secondaryForeground: string;
  border: string; input: string;
  primary?: string; accent?: string; ring?: string;
  bodyBg: string;
}

export const THEMES: Record<ThemeMode, ThemeTokens> = {
  default: {
    background: '0 0% 0%', foreground: '0 0% 98%',
    card: '0 0% 7%', cardForeground: '0 0% 98%',
    muted: '0 0% 15%', mutedForeground: '0 0% 55%',
    popover: '0 0% 10%', popoverForeground: '0 0% 98%',
    secondary: '0 0% 12%', secondaryForeground: '0 0% 98%',
    border: '0 0% 15%', input: '0 0% 12%',
    primary: '350 100% 60%', accent: '330 100% 65%', ring: '350 100% 60%',
    bodyBg: '#000',
  },
  light: {
    background: '30 25% 98%', foreground: '230 18% 12%',
    card: '0 0% 100%', cardForeground: '230 18% 12%',
    muted: '230 14% 94%', mutedForeground: '230 8% 42%',
    popover: '0 0% 100%', popoverForeground: '230 18% 12%',
    secondary: '230 14% 96%', secondaryForeground: '230 18% 12%',
    border: '230 14% 88%', input: '230 14% 95%',
    primary: '350 100% 52%', accent: '330 95% 58%', ring: '350 100% 52%',
    bodyBg: '#f9f8f6',
  },
  black: {
    background: '0 0% 0%', foreground: '0 0% 98%',
    card: '0 0% 3%', cardForeground: '0 0% 98%',
    muted: '0 0% 8%', mutedForeground: '0 0% 55%',
    popover: '0 0% 4%', popoverForeground: '0 0% 98%',
    secondary: '0 0% 6%', secondaryForeground: '0 0% 98%',
    border: '0 0% 10%', input: '0 0% 6%',
    primary: '350 100% 60%', accent: '330 100% 65%', ring: '350 100% 60%',
    bodyBg: '#000',
  },
  sunset: {
    background: '20 28% 6%', foreground: '30 30% 96%',
    card: '20 30% 10%', cardForeground: '30 30% 96%',
    muted: '20 20% 16%', mutedForeground: '25 18% 65%',
    popover: '20 30% 11%', popoverForeground: '30 30% 96%',
    secondary: '20 26% 14%', secondaryForeground: '30 30% 96%',
    border: '20 22% 18%', input: '20 25% 14%',
    primary: '14 100% 60%', accent: '38 100% 60%', ring: '14 100% 60%',
    bodyBg: '#180e09',
  },
  ocean: {
    background: '215 40% 6%', foreground: '210 30% 96%',
    card: '215 38% 10%', cardForeground: '210 30% 96%',
    muted: '215 25% 16%', mutedForeground: '210 18% 65%',
    popover: '215 38% 11%', popoverForeground: '210 30% 96%',
    secondary: '215 30% 14%', secondaryForeground: '210 30% 96%',
    border: '215 25% 20%', input: '215 28% 14%',
    primary: '195 100% 55%', accent: '180 90% 55%', ring: '195 100% 55%',
    bodyBg: '#070e18',
  },
  'midnight-gold': {
    background: '240 12% 4%', foreground: '40 20% 96%',
    card: '240 12% 8%', cardForeground: '40 20% 96%',
    muted: '240 10% 14%', mutedForeground: '40 8% 60%',
    popover: '240 12% 10%', popoverForeground: '40 20% 96%',
    secondary: '240 10% 12%', secondaryForeground: '40 20% 96%',
    border: '240 12% 18%', input: '240 12% 12%',
    primary: '42 95% 58%', accent: '36 90% 60%', ring: '42 95% 58%',
    bodyBg: '#08080d',
  },
};

export const applyTheme = (theme: ThemeMode) => {
  const root = document.documentElement;
  const t = THEMES[theme] || THEMES.default;
  root.style.setProperty('--background', t.background);
  root.style.setProperty('--foreground', t.foreground);
  root.style.setProperty('--card', t.card);
  root.style.setProperty('--card-foreground', t.cardForeground);
  root.style.setProperty('--muted', t.muted);
  root.style.setProperty('--muted-foreground', t.mutedForeground);
  root.style.setProperty('--popover', t.popover);
  root.style.setProperty('--popover-foreground', t.popoverForeground);
  root.style.setProperty('--secondary', t.secondary);
  root.style.setProperty('--secondary-foreground', t.secondaryForeground);
  root.style.setProperty('--border', t.border);
  root.style.setProperty('--input', t.input);
  if (t.primary) {
    root.style.setProperty('--primary', t.primary);
    root.style.setProperty('--ring', t.primary);
    root.style.setProperty('--sidebar-primary', t.primary);
    root.style.setProperty('--sidebar-ring', t.primary);
    root.style.setProperty('--glow-primary', t.primary);
    root.style.setProperty('--gradient-start', t.primary);
  }
  if (t.accent) {
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--glow-accent', t.accent);
    root.style.setProperty('--gradient-mid', t.accent);
  }
  document.body.style.background = t.bodyBg;
  document.documentElement.style.background = t.bodyBg;
  try { localStorage.setItem('uf_theme', theme); } catch { /* ignore */ }
};

export type { ThemeMode };

// Run immediately on import — before React mounts.
try {
  const saved = (localStorage.getItem('uf_theme') as ThemeMode) || 'default';
  applyTheme(saved);
} catch {
  applyTheme('default');
}
