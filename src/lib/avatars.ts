import type { AvatarVariant } from '@/components/PortraitAvatar';

export interface PresetAvatar {
  id: AvatarVariant;
  name: string;
  tag: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'hoodie-guy',     name: 'Wave Hi',  tag: 'Waves at you' },
  { id: 'sweater-girl',   name: 'Glow',     tag: 'Sparkles & sway' },
  { id: 'glasses-beard',  name: 'Aura',     tag: 'Soft glow ring' },
  { id: 'leather-bob',    name: 'Rockstar', tag: 'Bobbing sparkles' },
  { id: 'chain-guy',      name: 'Vibing',   tag: 'Music notes' },
  { id: 'pink-sweater',   name: 'In Love',  tag: 'Floating hearts' },
  { id: 'white-hoodie',   name: 'Halo',     tag: 'Pulsing ring' },
  { id: 'afro-yellow',    name: 'Hello!',   tag: 'Waves at you' },
  { id: 'headphones-boy', name: 'DJ',       tag: 'Beats & notes' },
  { id: 'pink-beanie',    name: 'Crush',    tag: 'Floating hearts' },
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
