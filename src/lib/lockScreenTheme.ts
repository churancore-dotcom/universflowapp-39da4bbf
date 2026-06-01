import { useEffect, useState } from 'react';

export type LockScreenThemeId =
  | 'classic'
  | 'vinyl'
  | 'pulse'
  | 'prism'
  | 'orbit'
  | 'stage';

export interface LockScreenTheme {
  id: LockScreenThemeId;
  label: string;
  description: string;
  premium: boolean;
  /** Background CSS for the selector thumbnail */
  preview: string;
  /** Tiny tag rendered on top of the preview to hint at the artwork style */
  badge: string;
}

export const LOCK_SCREEN_THEMES: LockScreenTheme[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Square cover • blurred art background',
    premium: false,
    preview: 'linear-gradient(135deg, #1f1f25 0%, #3a3a45 100%)',
    badge: 'Square art',
  },
  {
    id: 'vinyl',
    label: 'Vinyl',
    description: 'Spinning record • aurora glow',
    premium: true,
    preview:
      'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000 70%), conic-gradient(from 0deg, #0b1e3f, #1f7a6a, #b833a8, #0b1e3f)',
    badge: 'Spinning disc',
  },
  {
    id: 'pulse',
    label: 'Pulse',
    description: 'Cover with beat-driven rings',
    premium: true,
    preview:
      'radial-gradient(circle at 50% 50%, #ff2d55 0%, #5e5ce6 40%, #06030f 90%)',
    badge: 'Pulse waves',
  },
  {
    id: 'prism',
    label: 'Prism',
    description: 'Rotating gradient frame • liquid glow',
    premium: true,
    preview:
      'conic-gradient(from 0deg, #ff2d55, #5e5ce6, #ff9500, #ff2d55), radial-gradient(circle, #06030f 0%, transparent 60%)',
    badge: 'Gradient ring',
  },
  {
    id: 'orbit',
    label: 'Orbit',
    description: 'Cover with orbiting particles • starfield',
    premium: true,
    preview:
      'radial-gradient(circle at 30% 30%, #2a2563 0%, #06030f 70%), radial-gradient(circle at 70% 70%, #5b2a8c 0%, transparent 50%)',
    badge: 'Orbiting stars',
  },
  {
    id: 'stage',
    label: 'Stage',
    description: 'Spotlight cover • neon synthwave grid',
    premium: true,
    preview: 'linear-gradient(180deg, #1b0633 0%, #4a0e6e 50%, #ff2d8a 100%)',
    badge: 'Neon spotlight',
  },
];

const STORAGE_KEY = 'uf_lockscreen_theme';

// Legacy ids -> new ids (backwards compat for users who picked one already)
const LEGACY_MAP: Record<string, LockScreenThemeId> = {
  album: 'classic',
  aurora: 'vinyl',
  liquid: 'prism',
  waves: 'pulse',
  starfield: 'orbit',
  neon: 'stage',
};

export const getStoredLockScreenTheme = (): LockScreenThemeId => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'classic';
    if (LOCK_SCREEN_THEMES.some(t => t.id === raw)) return raw as LockScreenThemeId;
    if (LEGACY_MAP[raw]) return LEGACY_MAP[raw];
  } catch { /* ignore */ }
  return 'classic';
};

export const setStoredLockScreenTheme = (id: LockScreenThemeId) => {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('uf:lockscreen-theme', { detail: { id } }));
};

export const useLockScreenTheme = (isPremium: boolean): LockScreenThemeId => {
  const [theme, setTheme] = useState<LockScreenThemeId>(getStoredLockScreenTheme);

  useEffect(() => {
    const handler = (e: Event) => setTheme((e as CustomEvent).detail.id);
    window.addEventListener('uf:lockscreen-theme', handler);
    return () => window.removeEventListener('uf:lockscreen-theme', handler);
  }, []);

  // Non-premium users always fall back to the free classic theme.
  if (!isPremium) return 'classic';
  return theme;
};
