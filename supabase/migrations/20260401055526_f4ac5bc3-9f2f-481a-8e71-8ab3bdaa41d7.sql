
-- Remove sensitive tables from realtime publication (correct syntax without IF EXISTS)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['user_subscriptions','donations','content_reports','song_dedications','profiles','recently_played'])
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl AND schemaname = 'public'
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl);
    END IF;
  END LOOP;
END;
$$;

-- The prevent_admin_field_change trigger already exists but may not be attached
-- Ensure it's attached to profiles
DROP TRIGGER IF EXISTS enforce_no_admin_field_change ON public.profiles;
CREATE TRIGGER enforce_no_admin_field_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_field_change();

-- Fix the profiles update policy (remove the OLD reference which doesn't work in RLS)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
