
-- Restore baseline grants so owner queries on user_id keep working
GRANT SELECT ON public.app_reviews TO authenticated;

-- Replace the broad SELECT policy with an owner-only policy.
DROP POLICY IF EXISTS "Authenticated users can view reviews" ON public.app_reviews;
CREATE POLICY "Users can view their own review row"
ON public.app_reviews FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Public-facing view that exposes ONLY non-identifying columns.
-- Runs with definer rights so it bypasses base-table RLS but exposes no user_id.
CREATE OR REPLACE VIEW public.app_reviews_public
WITH (security_invoker = false) AS
SELECT id, rating, comment, display_name, created_at, updated_at
FROM public.app_reviews;

GRANT SELECT ON public.app_reviews_public TO anon, authenticated;
