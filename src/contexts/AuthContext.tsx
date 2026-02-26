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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch
        if (session?.user) {
          setTimeout(() => {
            checkAdminStatus(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    // Create profile with share_code after successful signup
    if (!error && data.user) {
      const shareCode = Math.random().toString(36).substring(2, 10);
      await supabase.from('profiles').upsert({
        user_id: data.user.id,
        email: email,
        share_code: shareCode,
      }, { onConflict: 'user_id' });
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    // Retry up to 2 times for transient network failures
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          // If it's a retryable fetch error, retry after a short delay
          if (error.message?.includes('Failed to fetch') && attempt < 2) {
            lastError = error as Error;
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          return { error: error as Error };
        }

        // Do admin/profile checks in background — don't block login
        if (data.user) {
          const userId = data.user.id;
          
          // Fire-and-forget: ensure share_code exists (don't block login)
          Promise.resolve(
            supabase
              .from('profiles')
              .select('share_code')
              .eq('user_id', userId)
              .single()
          ).then(({ data: profile }) => {
            if (profile && !profile.share_code) {
              const newShareCode = Math.random().toString(36).substring(2, 10);
              supabase.from('profiles').update({ share_code: newShareCode }).eq('user_id', userId);
            }
          }).catch(() => {});

          // Check admin — with timeout so login doesn't hang
          try {
            const adminPromise = supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId)
              .eq('role', 'admin')
              .maybeSingle();
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), 3000)
            );
            
            const { data: roleData } = await Promise.race([adminPromise, timeoutPromise]) as any;
            const adminStatus = !!roleData;
            setIsAdmin(adminStatus);
            return { error: null, isAdmin: adminStatus };
          } catch {
            setIsAdmin(false);
            return { error: null, isAdmin: false };
          }
        }

        return { error: null, isAdmin: false };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Login failed. Check your connection.');
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }
    }
    return { error: lastError || new Error('Login failed. Check your connection.') };
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
