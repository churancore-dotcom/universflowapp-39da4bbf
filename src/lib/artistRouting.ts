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

  try {
    const { data: application } = await supabase
      .from('artist_applications')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (application?.status === 'pending' || application?.status === 'rejected') return '/artist/status';
    if (application?.status === 'approved') return '/artist/status';
  } catch {
    // Fall back to signup intent below.
  }

  return hasArtistSignupIntent(user) ? '/artist/apply' : null;
}