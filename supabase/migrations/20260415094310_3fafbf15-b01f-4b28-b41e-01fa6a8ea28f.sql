
-- 1. Remove the policy that leaks donor emails to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view non-anonymous donations" ON public.donations;

-- 2. Fix profiles INSERT to prevent is_admin escalation
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_admin = false);

-- 3. Remove public listening history exposure
DROP POLICY IF EXISTS "Anyone can view recently played" ON public.recently_played;
