
-- Tighten audit_logs INSERT: disallow NULL user_id from clients
DROP POLICY IF EXISTS "Authenticated users can log their own events" ON public.audit_logs;
CREATE POLICY "Authenticated users can log their own events"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Explicit deny-all on internal_secrets (defense in depth; only SECURITY DEFINER functions read it)
REVOKE ALL ON public.internal_secrets FROM anon, authenticated;
DROP POLICY IF EXISTS "Deny all client access to internal_secrets" ON public.internal_secrets;
CREATE POLICY "Deny all client access to internal_secrets"
  ON public.internal_secrets FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Lock down promo_codes: explicit deny for non-admin reads (admin policy already covers admins)
-- The existing "Admins can manage promo codes" policy uses FOR ALL with USING-only, so no INSERT/UPDATE/DELETE
-- can be performed by non-admins anyway. Add an explicit denial for clarity.
DROP POLICY IF EXISTS "Non-admins cannot read promo codes" ON public.promo_codes;
CREATE POLICY "Non-admins cannot read promo codes"
  ON public.promo_codes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Rate limiting table for credit-consuming edge functions
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, endpoint)
);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies => only service role (used by edge functions) can read/write.

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  _user_id uuid,
  _endpoint text,
  _max_per_minute integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  INSERT INTO public.api_rate_limits(user_id, endpoint, window_start, request_count)
  VALUES (_user_id, _endpoint, now(), 1)
  ON CONFLICT (user_id, endpoint) DO UPDATE
    SET request_count = CASE
          WHEN public.api_rate_limits.window_start < now() - interval '1 minute' THEN 1
          ELSE public.api_rate_limits.request_count + 1
        END,
        window_start = CASE
          WHEN public.api_rate_limits.window_start < now() - interval '1 minute' THEN now()
          ELSE public.api_rate_limits.window_start
        END
  RETURNING request_count INTO v_count;

  RETURN v_count <= _max_per_minute;
END;
$$;
