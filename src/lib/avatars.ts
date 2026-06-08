import a1 from '@/assets/avatars/avatar-1.jpg';
import a2 from '@/assets/avatars/avatar-2.jpg';
import a3 from '@/assets/avatars/avatar-3.jpg';
import a4 from '@/assets/avatars/avatar-4.jpg';
import a5 from '@/assets/avatars/avatar-5.jpg';
import a6 from '@/assets/avatars/avatar-6.jpg';
import a7 from '@/assets/avatars/avatar-7.jpg';
import a8 from '@/assets/avatars/avatar-8.jpg';
import a9 from '@/assets/avatars/avatar-9.jpg';
import a10 from '@/assets/avatars/avatar-10.jpg';

export interface PresetAvatar {
  id: string;
  url: string;
  name: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'rose-mask', url: a1, name: 'Rose Mask' },
  { id: 'cosmonaut', url: a2, name: 'Cosmonaut' },
  { id: 'pink-fox', url: a3, name: 'Pink Fox' },
  { id: 'holo-bubble', url: a4, name: 'Holo Bubble' },
  { id: 'neon-samurai', url: a5, name: 'Neon Samurai' },
  { id: 'chrome-wolf', url: a6, name: 'Chrome Wolf' },
  { id: 'beats-panda', url: a7, name: 'Beats Panda' },
  { id: 'gem-geode', url: a8, name: 'Gem Geode' },
  { id: 'dj-cat', url: a9, name: 'DJ Cat' },
  { id: 'phoenix', url: a10, name: 'Phoenix' },
];

export const resolveAvatar = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const preset = PRESET_AVATARS.find(a => a.id === url);
  if (preset) return preset.url;
  return url;
};
