CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    WHERE us.user_id = _user_id
      AND us.status = 'active'
      AND us.subscription_type IN ('premium_monthly', 'premium_yearly')
      AND (us.expires_at IS NULL OR us.expires_at > now())
  )
$$;

DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.listening_sessions;
CREATE POLICY "Premium users can create sessions"
ON public.listening_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_user_id AND public.is_premium_user(auth.uid()));

DROP POLICY IF EXISTS "Members and host can view session" ON public.listening_sessions;
CREATE POLICY "Premium members and hosts can view session"
ON public.listening_sessions
FOR SELECT
TO authenticated
USING (public.is_premium_user(auth.uid()) AND (auth.uid() = host_user_id OR public.is_session_member(id, auth.uid())));

DROP POLICY IF EXISTS "Host can update their session" ON public.listening_sessions;
CREATE POLICY "Premium host can update their session"
ON public.listening_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = host_user_id AND public.is_premium_user(auth.uid()))
WITH CHECK (auth.uid() = host_user_id AND public.is_premium_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can join sessions" ON public.listening_session_members;
CREATE POLICY "Premium users can join sessions"
ON public.listening_session_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_premium_user(auth.uid()));

DROP POLICY IF EXISTS "Members can view session members" ON public.listening_session_members;
CREATE POLICY "Premium members can view session members"
ON public.listening_session_members
FOR SELECT
TO authenticated
USING (public.is_premium_user(auth.uid()) AND (public.is_session_member(session_id, auth.uid()) OR public.is_session_host(session_id, auth.uid())));