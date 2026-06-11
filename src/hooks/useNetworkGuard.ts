import { useEffect, useState } from 'react';

/**
 * Network online/offline guard.
 *
 * - Returns the current online state.
 * - When the device drops offline, calls `onOffline` (use it to pause playback).
 * - When the device comes back online, calls `onOnline` (use it to resume).
 *
 * Both handlers are optional — pass only what you need.
 */
export interface NetworkGuardHandlers {
  onOffline?: () => void;
  onOnline?: () => void;
}

export function useNetworkGuard(handlers: NetworkGuardHandlers = {}): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      try { handlers.onOnline?.(); } catch { /* ignore */ }
    };
    const goOffline = () => {
      setIsOnline(false);
      try { handlers.onOffline?.(); } catch { /* ignore */ }
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
    // Handlers are intentionally read fresh from closure each effect run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers.onOnline, handlers.onOffline]);

  return isOnline;
}
