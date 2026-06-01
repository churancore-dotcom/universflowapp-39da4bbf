// Listening Aura: maps a song's mood/genre to a live "aura" persona.
// Used to render a real-time mood ring on the user's profile that friends
// can watch update as the user plays music.

export interface Aura {
  type: string;
  label: string;
  color: string;       // hex
  glow: string;        // softer hex/rgba for halos
  emoji: string;
  description: string;
}

export const IDLE_AURA: Aura = {
  type: 'idle',
  label: 'Quiet',
  color: '#6E6E73',
  glow: 'rgba(110,110,115,0.5)',
  emoji: '🌙',
  description: 'Not listening right now',
};

const AURAS: Record<string, Aura> = {
  hype: {
    type: 'hype',
    label: 'Hype',
    color: '#FF2D55',
    glow: 'rgba(255,45,85,0.65)',
    emoji: '🔥',
    description: 'Turned all the way up',
  },
  romantic: {
    type: 'romantic',
    label: 'In Love',
    color: '#FF375F',
    glow: 'rgba(255,55,95,0.6)',
    emoji: '💗',
    description: 'Soft, slow, swooning',
  },
  sad: {
    type: 'sad',
    label: 'Melancholy',
    color: '#5E5CE6',
    glow: 'rgba(94,92,230,0.55)',
    emoji: '🌧️',
    description: 'Feeling it deeply',
  },
  focused: {
    type: 'focused',
    label: 'Locked In',
    color: '#BF5AF2',
    glow: 'rgba(191,90,242,0.55)',
    emoji: '🎯',
    description: 'Pure focus mode',
  },
  calm: {
    type: 'calm',
    label: 'Floating',
    color: '#5AC8FA',
    glow: 'rgba(90,200,250,0.55)',
    emoji: '🫧',
    description: 'Calm, easy, breathing',
  },
  happy: {
    type: 'happy',
    label: 'Glowing',
    color: '#FFD60A',
    glow: 'rgba(255,214,10,0.55)',
    emoji: '✨',
    description: 'All sunshine',
  },
  night: {
    type: 'night',
    label: 'Late Night',
    color: '#0A84FF',
    glow: 'rgba(10,132,255,0.55)',
    emoji: '🌌',
    description: 'After-hours vibes',
  },
  rebel: {
    type: 'rebel',
    label: 'Rebel',
    color: '#FF453A',
    glow: 'rgba(255,69,58,0.6)',
    emoji: '⚡',
    description: 'Loud and unbothered',
  },
};

const KEYWORDS: Array<[RegExp, keyof typeof AURAS]> = [
  [/(workout|gym|hype|edm|dance|party|trap|drill|hard|club|banger)/i, 'hype'],
  [/(metal|punk|rock|aggressive|rage)/i, 'rebel'],
  [/(love|romantic|r&b|rnb|valentine|kiss|heart)/i, 'romantic'],
  [/(sad|breakup|heartbreak|cry|alone|melancholy|blues|tears)/i, 'sad'],
  [/(focus|study|classical|instrumental|piano|cinematic)/i, 'focused'],
  [/(lofi|lo-fi|chill|ambient|acoustic|relax|sleep|calm|peace)/i, 'calm'],
  [/(happy|sunshine|summer|feel.?good|indie pop|pop)/i, 'happy'],
  [/(night|midnight|late|moon|after.?hours|2 ?am|3 ?am)/i, 'night'],
];

export function computeAura(input: {
  title?: string | null;
  artist?: string | null;
  mood?: string | null;
  genre?: string | null;
}): Aura {
  const haystack = [input.mood, input.genre, input.title, input.artist]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!haystack) return AURAS.calm;

  for (const [re, key] of KEYWORDS) {
    if (re.test(haystack)) return AURAS[key];
  }
  // Fallback by time of day for some life signal
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 5) return AURAS.night;
  if (hour < 11) return AURAS.happy;
  return AURAS.calm;
}

export function getAuraByType(type?: string | null): Aura {
  if (!type) return IDLE_AURA;
  return AURAS[type] || IDLE_AURA;
}
