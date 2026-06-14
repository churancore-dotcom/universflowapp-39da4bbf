// One-shot welcome push fired on the FIRST successful FCM registration after
// install. We pick a random greeting so users who reinstall / re-register on
// a new device don't see the same line twice. Delivery uses the existing
// `send-system-push` edge function with a per-user system token — same path
// admin announcements take, so it lands on the lockscreen like a real push.

import { supabase } from '@/integrations/supabase/client';

const flagKeyFor = (userId: string) => `uf_welcome_push_sent_v2_${userId}`;

const TITLES = [
  '🎶 Welcome to Universflow',
  '✨ You made it in',
  '🚀 Welcome aboard',
  '💜 Glad you’re here',
  '🎧 Tune in, you’re home',
  '🌌 Welcome to your universe',
  '🔥 Let the music begin',
  '🌙 Welcome, dreamer',
];

const BODIES = [
  'Your personal music universe just got unlocked. Tap to start vibing — best regards from the Universflow crew.',
  'Millions of songs, zero noise. Dive in and find your sound. Best regards, Universflow.',
  'Fresh beats, smart playlists, and your own offline library — all yours now. Best regards, Universflow.',
  'Press play. Lose track of time. Repeat. Best regards from everyone at Universflow.',
  'Made for headphones, built for moods. Glad you’re here — Universflow team.',
  'Your daily soundtrack starts now. Enjoy the ride. Best regards, Universflow.',
  'Search a song, save a vibe, share a moment. Welcome home — Universflow.',
  'Good music. Good company. Welcome to Universflow.',
  'The world’s music, your way. Best regards from the Universflow family.',
  'We built this for moments like yours. Have fun in there — Universflow team.',
];

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Fires the welcome push at most once per device (tracked in localStorage).
 * Safe to call repeatedly — no-op after the first successful send.
 */
export async function maybeSendWelcomePush(userId: string): Promise<void> {
  const flagKey = flagKeyFor(userId);
  try {
    if (!userId) return;
    if (localStorage.getItem(flagKey) === '1') return;

    const title = pick(TITLES);
    const body = pick(BODIES);

    const { data, error } = await supabase.functions.invoke('send-system-push', {
      body: {
        user_ids: [userId],
        title,
        body,
        deep_link: '/home',
        self_only: true,
      },
    });

    if (error) {
      console.warn('[WelcomePush] rpc failed', error);
      return;
    }

    if (!data?.success || (typeof data.success_count === 'number' && data.success_count < 1)) {
      console.warn('[WelcomePush] no APK device received the push yet', data);
      return;
    }

    localStorage.setItem(flagKey, '1');
  } catch (e) {
    console.warn('[WelcomePush] unexpected error', e);
  }
}
