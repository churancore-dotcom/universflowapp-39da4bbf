
-- 1. Add view_count to artist_songs
ALTER TABLE public.artist_songs
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- 2. Allow the privileged-field trigger to permit the new column the same way
--    Update the trigger so unprivileged users also can't tamper with view_count.
CREATE OR REPLACE FUNCTION public.prevent_artist_song_privileged_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_jwt_role text; v_privileged boolean;
BEGIN
  BEGIN v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN v_jwt_role := NULL; END;

  v_privileged := v_jwt_role = 'service_role'
    OR current_user IN ('service_role','postgres','supabase_admin')
    OR public.has_role(auth.uid(), 'admin'::public.app_role);

  IF NOT v_privileged THEN
    NEW.status := OLD.status;
    NEW.takedown_reason := OLD.takedown_reason;
    NEW.play_count := OLD.play_count;
    NEW.like_count := OLD.like_count;
    NEW.download_count := OLD.download_count;
    NEW.view_count := OLD.view_count;
  END IF;

  IF NEW.status = 'live'::public.artist_song_status THEN
    NEW.takedown_reason := NULL;
  END IF;

  RETURN NEW;
END $function$;

-- 3. SECURITY DEFINER RPCs that any authenticated (or anon) user can call to
--    bump counters. These bypass the privileged-field trigger safely because
--    they update exactly one column with a small atomic increment.
CREATE OR REPLACE FUNCTION public.increment_artist_song_play(_song_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.artist_songs
     SET play_count = play_count + 1
   WHERE id = _song_id AND status = 'live'::public.artist_song_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_artist_song_view(_song_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.artist_songs
     SET view_count = view_count + 1
   WHERE id = _song_id AND status = 'live'::public.artist_song_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_artist_song_download(_song_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.artist_songs
     SET download_count = download_count + 1
   WHERE id = _song_id AND status = 'live'::public.artist_song_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_artist_song_play(uuid)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_artist_song_view(uuid)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_artist_song_download(uuid) TO anon, authenticated;
