-- 1) Restrictive deny on audit_logs writes for non-service roles
DROP POLICY IF EXISTS "Deny client writes to audit logs" ON public.audit_logs;
CREATE POLICY "Deny client writes to audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 2) Remove user_subscriptions from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_subscriptions;