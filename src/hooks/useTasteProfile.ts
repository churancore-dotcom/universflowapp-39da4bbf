import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getTasteProfile, type TasteProfile } from '@/lib/feedPersonalizer';

const EMPTY: TasteProfile = { artists: new Map(), keywords: new Map(), skips: new Map(), signalCount: 0 };

/**
 * Silent personalization hook — returns the user's listening-taste profile.
 * Cached for an hour via React Query AND a module-level cache inside
 * feedPersonalizer, so concurrent shelves share one DB hit.
 */
export function useTasteProfile(): TasteProfile {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['taste-profile', user?.id ?? 'anon'],
    queryFn: () => getTasteProfile(user?.id ?? null),
    enabled: !!user,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
  return data ?? EMPTY;
}
