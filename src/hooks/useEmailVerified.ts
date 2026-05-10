import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns whether the signed-in user has verified their email
 * (via the custom Resend link flow → profiles.email_verified).
 */
export function useEmailVerified() {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setIsVerified(false);
      setLoading(false);
      return false;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('user_id', user.id)
        .maybeSingle();
      const ok = !!data?.email_verified;
      setIsVerified(ok);
      return ok;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const resendVerification = useCallback(async () => {
    if (!user?.email) return false;
    const { error } = await supabase.functions.invoke('send-verification-link', {
      body: { email: user.email },
    });
    return !error;
  }, [user]);

  const requireVerified = (_action = 'continue'): boolean => isVerified;

  return {
    user,
    isVerified,
    loading,
    refresh,
    resendVerification,
    requireVerified,
    sendCode: resendVerification, // legacy alias
  };
}
