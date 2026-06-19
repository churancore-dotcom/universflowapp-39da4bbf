
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.artist_applications FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.artist_songs FROM anon;
GRANT SELECT ON public.artist_songs TO anon;

REVOKE SELECT (admin_note) ON public.artist_applications FROM authenticated;
GRANT SELECT (id, user_id, status, real_name, stage_name, country_code, phone,
              id_doc_type, id_doc_front_path, id_doc_back_path, selfie_path,
              artist_photo_path, social_links, reviewed_at, reviewed_by, created_at, updated_at)
  ON public.artist_applications TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_artist_application_note(_app_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_owner uuid; v_note text;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT user_id, admin_note INTO v_owner, v_note FROM public.artist_applications WHERE id = _app_id;
  IF v_owner IS NULL THEN RETURN NULL; END IF;
  IF v_owner = v_uid OR public.has_role(v_uid, 'admin'::public.app_role) THEN RETURN v_note; END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_my_artist_application_note(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_artist_application_note(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_artist_application_note(_app_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_note text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT admin_note INTO v_note FROM public.artist_applications WHERE id = _app_id;
  RETURN v_note;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_get_artist_application_note(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_artist_application_note(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "artist_songs owner delete" ON public.artist_songs;
DROP POLICY IF EXISTS "artist_songs owner update" ON public.artist_songs;
CREATE POLICY "artist_songs owner delete" ON public.artist_songs
  FOR DELETE TO authenticated
  USING (auth.uid() = artist_user_id AND public.has_role(auth.uid(), 'artist'::public.app_role));
CREATE POLICY "artist_songs owner update" ON public.artist_songs
  FOR UPDATE TO authenticated
  USING (auth.uid() = artist_user_id AND public.has_role(auth.uid(), 'artist'::public.app_role))
  WITH CHECK (auth.uid() = artist_user_id AND public.has_role(auth.uid(), 'artist'::public.app_role));

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='realtime' AND c.relname='messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "deny unscoped realtime topics" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "deny unscoped realtime topics" ON realtime.messages
        AS RESTRICTIVE FOR ALL TO anon, authenticated
        USING ((realtime.topic())::text ~ '^mate-room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
        WITH CHECK ((realtime.topic())::text ~ '^mate-room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
    $p$;
  END IF;
END $outer$;

DO $defrev$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $defrev$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_premium_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_profile_by_share_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_viral_song_events(text, text, integer, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.consume_free_skip() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_jam_room(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_listening_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_device_token(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_payment_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log_event(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_artist_song_play(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_artist_song_download(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_artist_song_view(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer) TO authenticated;
