import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthError } from '@/lib/errorMessages';
import { setSentryUser } from '@/lib/sentry';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  isOffline: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean }>;
  signUp: (email: string, password: string, username: string, countryCode?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const ensureUserProfile = useCallback(async (sessionUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', sessionUser.id)
        .maybeSingle();

      if (error || data) return;

      const { error: insertError } = await supabase.from('profiles').insert({
        user_id: sessionUser.id,
        email: sessionUser.email ?? null,
      });

      if (insertError && insertError.code !== '23505') {
        console.error('Profile bootstrap failed:', insertError);
      }
    } catch (error) {
      console.error('Profile bootstrap failed:', error);
    }
  }, []);

  const checkAdminRole = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      setIsAdmin(!!data);
      return !!data;
    } catch {
      setIsAdmin(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      // CRITICAL: never wipe the local session as a side effect of being offline.
      // When the device has no internet, Supabase's auto-refresh fails and emits
      // SIGNED_OUT / TOKEN_REFRESHED with a null session — that would log the user
      // out of the APK every time they open it without WiFi. Keep the cached
      // session so they can still play their downloaded songs.
      if (!nextSession && !navigator.onLine && event !== 'SIGNED_OUT') {
        setIsLoading(false);
        return;
      }
      // Also ignore an offline-driven SIGNED_OUT that wasn't user-initiated.
      // (A user-initiated signOut() also clears state in the signOut callback.)
      if (event === 'SIGNED_OUT' && !navigator.onLine) {
        setIsLoading(false);
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setSentryUser(nextSession?.user ? { id: nextSession.user.id, email: nextSession.user.email } : null);

      if (nextSession?.user) {
        setTimeout(async () => {
          await ensureUserProfile(nextSession.user);
          await checkAdminRole(nextSession.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
      }

      setIsLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        await ensureUserProfile(existingSession.user);
        await checkAdminRole(existingSession.user.id);

        // Validate the refresh token while online. If it's invalid (signed out
        // elsewhere, rotated keys, stale session), sign out cleanly instead of
        // looping on 401s from authenticated edge functions like music-indexer.
        if (navigator.onLine) {
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshErr) {
            await supabase.auth.signOut().catch(() => {});
          }
        }
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkAdminRole, ensureUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const { auditLog } = await import('@/lib/auditLog');
        auditLog.loginFailed(email, error.message);
        return { error: new Error(getAuthError(error)) };
      }

      if (data.user) {
        await ensureUserProfile(data.user);

        const { data: profile } = await supabase
          .from('profiles')
          .select('status, email_verified')
          .eq('user_id', data.user.id)
          .maybeSingle();

        // Email-verification gate: block sign-in until they confirm via the link
        if (profile && profile.email_verified === false) {
          await supabase.auth.signOut();
          return { error: new Error('EMAIL_NOT_VERIFIED') };
        }

        if (profile?.status === 'banned') {
          await supabase.auth.signOut();
          return { error: new Error('Your account has been banned. Contact support for help.') };
        }
        if (profile?.status === 'suspended') {
          await supabase.auth.signOut();
          return { error: new Error('Your account is temporarily suspended. Please try again later.') };
        }

        // Auto-expire premium if past expires_at (client-side belt-and-suspenders alongside cron)
        try {
          const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('id, status, expires_at, subscription_type')
            .eq('user_id', data.user.id)
            .maybeSingle();
          if (sub?.status === 'active' && sub.expires_at && new Date(sub.expires_at) < new Date()
              && sub.subscription_type !== 'free') {
            await supabase.from('user_subscriptions')
              .update({ status: 'expired' }).eq('id', sub.id);
          }
        } catch { /* non-fatal */ }

        const { auditLog } = await import('@/lib/auditLog');
        auditLog.loginSuccess(email);
      }

      const admin = data.user ? await checkAdminRole(data.user.id) : false;
      return { error: null, isAdmin: admin };
    } catch (error) {
      return { error: new Error(getAuthError(error)) };
    }
  }, [checkAdminRole, ensureUserProfile]);

  const signUp = useCallback(async (email: string, password: string, username: string, countryCode?: string) => {
    try {
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        return { error: new Error('Username must be 3-20 characters') };
      }
      if (!/^[a-zA-Z0-9_.]+$/.test(trimmedUsername)) {
        return { error: new Error('Username can only contain letters, numbers, dots and underscores') };
      }

      // Pre-flight uniqueness check (case-insensitive). Race-safe because the DB has a unique index too.
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('username', trimmedUsername)
        .maybeSingle();
      if (existing) {
        return { error: new Error('That username is already taken') };
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username: trimmedUsername,
            country_code: countryCode ? countryCode.toUpperCase().slice(0, 2) : undefined,
          },
        },
      });

      if (error) {
        // The unique-username DB index throws this if there was a race
        if (/duplicate key|unique constraint|profiles_username_lower_unique/i.test(error.message)) {
          return { error: new Error('That username is already taken') };
        }
        return { error: new Error(getAuthError(error)) };
      }

      // Auto-assign a random animated avatar so the profile feels alive from day one.
      try {
        const { pickRandomAvatar } = await import('@/lib/avatars');
        const newUserId = signUpData?.user?.id;
        if (newUserId) {
          await supabase
            .from('profiles')
            .update({ avatar_url: pickRandomAvatar() })
            .eq('user_id', newUserId);
        }
      } catch { /* non-fatal */ }

      // CRITICAL: Supabase auto-creates a session on signUp. Sign the user out
      // immediately so they must click the verification link and sign in fresh.
      // Clear local state synchronously first so no protected route flashes,
      // then sign out in the background (don't block navigation on it).
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      supabase.auth.signOut().catch(() => {});

      return { error: null };
    } catch (error) {
      return { error: new Error(getAuthError(error)) };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setIsAdmin(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, isAdmin, isLoading, isOffline, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
