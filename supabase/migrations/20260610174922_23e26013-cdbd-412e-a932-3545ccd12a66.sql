
-- 1) Prevent users from self-marking email as verified
CREATE OR REPLACE FUNCTION public.prevent_email_verified_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_verified IS DISTINCT FROM OLD.email_verified
     OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at THEN
    NEW.email_verified := OLD.email_verified;
    NEW.email_verified_at := OLD.email_verified_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_email_verified_change_trigger ON public.profiles;
CREATE TRIGGER prevent_email_verified_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_email_verified_change();

-- 2) Recreate the public view with SECURITY INVOKER so RLS of the caller is enforced
DROP VIEW IF EXISTS public.app_reviews_public;
CREATE VIEW public.app_reviews_public
WITH (security_invoker = true) AS
SELECT id, rating, comment, display_name, created_at, updated_at
FROM public.app_reviews;

GRANT SELECT ON public.app_reviews_public TO anon, authenticated;

-- 3) Strip location data on anonymous song_play_events inserts
CREATE OR REPLACE FUNCTION public.strip_anon_song_event_location()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.city := NULL;
    NEW.country_name := NULL;
    -- keep country_code (2-letter) for aggregate analytics; it's not PII
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS strip_anon_song_event_location_trigger ON public.song_play_events;
CREATE TRIGGER strip_anon_song_event_location_trigger
  BEFORE INSERT ON public.song_play_events
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_anon_song_event_location();
