
-- 1. Throttle table for artist push events
CREATE TABLE IF NOT EXISTS public.artist_push_throttle (
  artist_user_id uuid NOT NULL,
  event_kind text NOT NULL,
  last_notified_at timestamptz NOT NULL DEFAULT now(),
  count_since_last int NOT NULL DEFAULT 0,
  PRIMARY KEY (artist_user_id, event_kind)
);
GRANT SELECT ON public.artist_push_throttle TO authenticated;
GRANT ALL ON public.artist_push_throttle TO service_role;
ALTER TABLE public.artist_push_throttle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artist sees own throttle" ON public.artist_push_throttle
  FOR SELECT TO authenticated USING (artist_user_id = auth.uid());

-- 2. Artist follower push (throttled: max 1 per artist per 30 min, batches followers)
CREATE OR REPLACE FUNCTION public.on_artist_follower_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_last timestamptz;
  v_follower_name text;
  v_stage text;
  v_extra int;
BEGIN
  -- Skip self-follows
  IF NEW.follower_user_id = NEW.artist_user_id THEN RETURN NEW; END IF;

  INSERT INTO public.artist_push_throttle(artist_user_id, event_kind, last_notified_at, count_since_last)
  VALUES (NEW.artist_user_id, 'new_follower', now(), 0)
  ON CONFLICT (artist_user_id, event_kind) DO UPDATE
    SET count_since_last = public.artist_push_throttle.count_since_last + 1
  RETURNING last_notified_at INTO v_last;

  -- Throttle: only push if 30 min has passed since last
  IF v_last > now() - interval '30 minutes' AND v_last < now() THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(username, 'Someone') INTO v_follower_name
    FROM public.profiles WHERE user_id = NEW.follower_user_id;
  SELECT stage_name INTO v_stage
    FROM public.artist_profiles WHERE user_id = NEW.artist_user_id;

  SELECT count_since_last INTO v_extra
    FROM public.artist_push_throttle
    WHERE artist_user_id = NEW.artist_user_id AND event_kind = 'new_follower';

  PERFORM public.notify_system_push(
    ARRAY[NEW.artist_user_id],
    CASE WHEN v_extra > 1 THEN '🎉 ' || v_extra::text || ' new followers'
         ELSE '🎉 New follower' END,
    CASE WHEN v_extra > 1 THEN v_follower_name || ' and ' || (v_extra-1)::text || ' more started following you'
         ELSE v_follower_name || ' started following you' END,
    '/artist/followers'
  );

  UPDATE public.artist_push_throttle
    SET last_notified_at = now(), count_since_last = 0
    WHERE artist_user_id = NEW.artist_user_id AND event_kind = 'new_follower';
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_artist_follower_push ON public.artist_followers;
CREATE TRIGGER trg_artist_follower_push
AFTER INSERT ON public.artist_followers
FOR EACH ROW EXECUTE FUNCTION public.on_artist_follower_insert();

-- 3. Restore premium-expired push (single message, deep link to /premium)
-- Replace process_premium_expiry_notifications to send exactly ONE push per user
CREATE OR REPLACE FUNCTION public.process_premium_expiry_notifications()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE r RECORD; v_exp int := 0; v_users uuid[] := ARRAY[]::uuid[];
BEGIN
  FOR r IN
    SELECT id, user_id FROM public.user_subscriptions
    WHERE status = 'active'
      AND subscription_type IN ('premium_monthly','premium_yearly')
      AND expires_at IS NOT NULL AND expires_at <= now()
      AND notif_expired_at IS NULL
  LOOP
    UPDATE public.user_subscriptions
       SET status = 'expired',
           notif_expired_at = now(),
           updated_at = now()
     WHERE id = r.id;
    v_users := v_users || r.user_id;
    v_exp := v_exp + 1;
  END LOOP;

  IF array_length(v_users, 1) > 0 THEN
    PERFORM public.notify_system_push(
      v_users,
      'Your Premium has expired',
      'Tap to renew and keep Studio Spaces, Gapless Pro & Late Night Mode.',
      '/premium'
    );
  END IF;
  RETURN jsonb_build_object('expired', v_exp);
END $fn$;
