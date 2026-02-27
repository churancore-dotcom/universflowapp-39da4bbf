import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  isOffline: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      const isUserAdmin = !!data;
      setIsAdmin(isUserAdmin);
      return isUserAdmin;
    } catch {
      setIsAdmin(false);
      return false;
    }
  };

  const ensureShareCode = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('share_code')
        .eq('user_id', userId)
        .single();

      if (profile && !profile.share_code) {
        const code = Math.random().toString(36).substring(2, 10);
        await supabase.from('profiles').update({ share_code: code }).eq('user_id', userId);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && nextSession?.user) {
        setTimeout(() => {
          checkAdminStatus(nextSession.user.id);
          ensureShareCode(nextSession.user.id);
        }, 0);
      }

      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
      }
    });

    const timeoutId = setTimeout(() => setIsLoading(false), 5000);

    supabase.auth.getSession()
      .then(async ({ data: { session: existingSession } }) => {
        clearTimeout(timeoutId);
        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession?.user) {
          await checkAdminStatus(existingSession.user.id);
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    if (!navigator.onLine) {
      return { error: new Error('Connection failed. Please check your internet connection and try again.') };
    }

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          const isNetworkError =
            error.message?.includes('Failed to fetch') ||
            error.message?.toLowerCase().includes('network') ||
            (error as any)?.status === 0;

          if (isNetworkError && attempt < maxRetries) {
            lastError = error as Error;
            await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
            continue;
          }

          return { error: error as Error };
        }

        if (data.user) {
          ensureShareCode(data.user.id);
          const isUserAdmin = await checkAdminStatus(data.user.id);
          return { error: null, isAdmin: isUserAdmin };
        }

        return { error: null, isAdmin: false };
      } catch (err) {
        const asError = err instanceof Error ? err : new Error('Login failed');
        const isNetworkError = asError.message.includes('Failed to fetch') || asError.message.toLowerCase().includes('network');

        if (isNetworkError && attempt < maxRetries) {
          lastError = asError;
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
          continue;
        }

        return { error: asError };
      }
    }

    return { error: lastError || new Error('Connection failed. Please try again.') };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isLoading, isOffline, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
