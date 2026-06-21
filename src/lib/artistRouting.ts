import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type ArtistDestination = '/artist/studio' | '/artist/status' | '/artist/apply' | null;

export function hasArtistSignupIntent(user?: User | null): boolean {
  const metadata = (user?.user_metadata || {}) as Record<string, unknown>;
  if (metadata.account_type === 'artist') return true;
  if (typeof window === 'undefined') return false;
  return (
    localStorage.getItem('uf_post_verify_next')?.startsWith('/artist') ||
    !!localStorage.getItem('uf_artist_signup')
  );
}

export async function getArtistDestination(user?: User | null): Promise<ArtistDestination> {
  if (!user) return null;

  try {
    const { data: hasArtistRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'artist',
    });
    if (hasArtistRole) return '/artist/studio';
  } catch {
    // Keep routing resilient if the role check is temporarily unavailable.
  }

  // Only force-redirect into the artist flow when the user explicitly arrived
  // via the artist signup intent (just submitted, came from /artist/auth, etc).
  // A pending/rejected/approved application on its own must NEVER trap the
  // user on /artist/status every time they open the app — they're listeners
  // too, and admins must always reach the rest of the app. Users can still
  // visit /artist/status manually from the menu.
  if (!hasArtistSignupIntent(user)) return null;

  try {
    const { data: application } = await supabase
      .from('artist_applications_safe' as never)
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    const status = (application as { status?: string } | null)?.status;
    if (status === 'pending' || status === 'rejected' || status === 'approved') {
      return '/artist/status';
    }
  } catch {
    // Fall through to /artist/apply
  }

  return '/artist/apply';
}