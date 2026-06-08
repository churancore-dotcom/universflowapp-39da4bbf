import type { AvatarVariant } from '@/components/VideoAvatar';

export interface PresetAvatar {
  id: AvatarVariant;
  name: string;
  tag: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'headphones-boy', name: 'Headphones', tag: 'Lost in the beat' },
  { id: 'wavy-girl',      name: 'Cosy',       tag: 'Soft & smiling' },
  { id: 'glasses-beard',  name: 'Specs',      tag: 'Looking sharp' },
  { id: 'chain-guy',      name: 'Drip',       tag: 'Iced out' },
  { id: 'coffee-girl',    name: 'Café',       tag: 'Sipping coffee' },
  { id: 'peace-guy',      name: 'Peace',      tag: 'Peace & wink' },
  { id: 'kiss-girl',      name: 'Muah',       tag: 'Blowing a kiss' },
  { id: 'thumbs-guy',     name: 'Good Vibes', tag: 'Thumbs up' },
];

export const isPresetAvatar = (value: string | null | undefined): value is AvatarVariant => {
  if (!value) return false;
  return PRESET_AVATARS.some(a => a.id === value);
};

export const resolveAvatar = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (isPresetAvatar(url)) return null;
  return url;
};

export const pickRandomAvatar = (): AvatarVariant => {
  const i = Math.floor(Math.random() * PRESET_AVATARS.length);
  return PRESET_AVATARS[i].id;
};

