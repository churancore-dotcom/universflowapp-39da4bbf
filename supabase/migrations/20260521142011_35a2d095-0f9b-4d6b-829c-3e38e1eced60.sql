-- 1. app_reviews.user_id column-level revoke (re-apply to be safe; column-level grants
-- can silently disappear after table recreations).
REVOKE SELECT (user_id) ON public.app_reviews FROM anon, authenticated;
-- Admins keep access via the existing "Admins manage reviews" policy (ALL).

-- 2. promo_codes: add explicit RESTRICTIVE deny for non-admin authenticated users.
-- The existing permissive policy implicitly denies non-admins, but a future permissive
-- policy could re-open it. Restrictive AND-combines with all others.
DROP POLICY IF EXISTS "promo_codes_admin_only_restrictive" ON public.promo_codes;
CREATE POLICY "promo_codes_admin_only_restrictive"
ON public.promo_codes
AS RESTRICTIVE
FOR SELECT
TO anon, authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));