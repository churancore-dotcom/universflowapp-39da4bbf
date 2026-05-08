export interface MusicCollection {
  slug: string;
  label: string;
  emoji: string;
  query: string;
  subtitle: string;
  gradient: string;
}

export const MUSIC_COLLECTIONS: MusicCollection[] = [
  { slug: 'bollywood-classics', label: 'Bollywood\nClassics', emoji: '🎬', query: 'bollywood hindi hits', subtitle: 'Hindi cinema essentials', gradient: 'linear-gradient(135deg,hsl(var(--glow-cyan)),hsl(var(--info)),hsl(var(--glow-purple)))' },
  { slug: 'k-pop-essentials', label: 'K-Pop\nEssentials', emoji: '🇰🇷', query: 'k-pop hits', subtitle: 'Korean pop leaders', gradient: 'linear-gradient(135deg,hsl(var(--accent)),hsl(var(--primary)),hsl(var(--glow-purple)))' },
  { slug: 'punjabi-bangers', label: 'Punjabi\nBangers', emoji: '🥁', query: 'punjabi hits', subtitle: 'Punjabi tracks moving now', gradient: 'linear-gradient(135deg,hsl(var(--success)),hsl(var(--glow-green)),hsl(var(--info)))' },
  { slug: 'indie-vibes', label: 'Indie\nVibes', emoji: '🎻', query: 'indie pop', subtitle: 'Independent favourites', gradient: 'linear-gradient(135deg,hsl(var(--glow-purple)),hsl(var(--accent)),hsl(var(--primary)))' },
  { slug: 'hip-hop-heat', label: 'Hip Hop\nHeat', emoji: '🔥', query: 'hip hop rap hits', subtitle: 'Rap and hip-hop heat', gradient: 'linear-gradient(135deg,hsl(var(--warning)),hsl(var(--glow-orange)),hsl(var(--primary)))' },
  { slug: 'lo-fi-chill', label: 'Lo-Fi\nChill', emoji: '🌙', query: 'lofi chill beats', subtitle: 'Soft focus sessions', gradient: 'linear-gradient(135deg,hsl(var(--info)),hsl(var(--glow-cyan)),hsl(var(--glow-purple)))' },
  { slug: 'latin-fiesta', label: 'Latin\nFiesta', emoji: '💃', query: 'latin reggaeton hits', subtitle: 'Latin streaming favourites', gradient: 'linear-gradient(135deg,hsl(var(--glow-orange)),hsl(var(--primary)),hsl(var(--glow-purple)))' },
  { slug: 'workout-pump', label: 'Workout\nPump', emoji: '💪', query: 'workout edm hits', subtitle: 'High-energy tracks', gradient: 'linear-gradient(135deg,hsl(var(--success)),hsl(var(--info)),hsl(var(--accent)))' },
];

export const getCollectionBySlug = (slug?: string) =>
  MUSIC_COLLECTIONS.find((collection) => collection.slug === slug) || MUSIC_COLLECTIONS[0];