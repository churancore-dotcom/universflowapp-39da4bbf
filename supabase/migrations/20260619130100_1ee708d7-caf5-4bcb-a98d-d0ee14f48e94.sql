
-- 1. Drop the duplicate-firing premium push triggers
DROP TRIGGER IF EXISTS trg_premium_activated_push ON public.user_subscriptions;
DROP TRIGGER IF EXISTS trg_premium_expired_push  ON public.user_subscriptions;
DROP FUNCTION IF EXISTS public.on_premium_activated_push() CASCADE;
DROP FUNCTION IF EXISTS public.on_premium_expired_push() CASCADE;

-- 2. Strip the duplicate notify_system_push() calls from grant paths.
--    Premium activation/rejection no longer auto-pushes — the UI already shows status.

CREATE OR REPLACE FUNCTION public.admin_review_payment_request(p_request_id uuid, p_status text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_req public.payment_requests%ROWTYPE;
  v_expires timestamptz; v_type public.subscription_type; v_base timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review status';
  END IF;

  SELECT * INTO v_req FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment request not found'; END IF;

  PERFORM set_config('request.skip_payment_grant', '1', true);
  UPDATE public.payment_requests
  SET status = p_status, reviewed_at = COALESCE(reviewed_at, now()), updated_at = now()
  WHERE id = p_request_id RETURNING * INTO v_req;

  IF p_status = 'approved' THEN
    SELECT GREATEST(now(), COALESCE(us.expires_at, now())) INTO v_base
      FROM public.user_subscriptions us WHERE us.user_id = v_req.user_id LIMIT 1;
    v_base := COALESCE(v_base, now());

    IF v_req.plan = 'lifetime' THEN
      v_expires := '2099-12-31 23:59:59+00'::timestamptz; v_type := 'premium_yearly'::public.subscription_type;
    ELSIF v_req.plan = 'quarterly' THEN
      v_expires := v_base + interval '90 days'; v_type := 'premium_yearly'::public.subscription_type;
    ELSIF v_req.plan = 'bimonthly' THEN
      v_expires := v_base + interval '60 days'; v_type := 'premium_monthly'::public.subscription_type;
    ELSE
      v_expires := v_base + interval '30 days'; v_type := 'premium_monthly'::public.subscription_type;
    END IF;

    INSERT INTO public.user_subscriptions (user_id, subscription_type, status, expires_at, platform)
    VALUES (v_req.user_id, v_type, 'active', v_expires, 'web')
    ON CONFLICT (user_id) DO UPDATE SET
      subscription_type = EXCLUDED.subscription_type, status = 'active',
      expires_at = GREATEST(public.user_subscriptions.expires_at, EXCLUDED.expires_at),
      platform = 'web', updated_at = now();
  END IF;
  -- NO push notifications: user already sees status change in-app.

  RETURN jsonb_build_object('success', true, 'status', p_status, 'user_id', v_req.user_id);
END;
$function$;

-- 3. process_premium_expiry_notifications: keep expiring rows but NO push.
CREATE OR REPLACE FUNCTION public.process_premium_expiry_notifications()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r RECORD; v_exp int := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.user_subscriptions
    WHERE status = 'active'
      AND subscription_type IN ('premium_monthly','premium_yearly')
      AND expires_at IS NOT NULL AND expires_at <= now()
  LOOP
    UPDATE public.user_subscriptions
       SET status = 'expired',
           notif_expired_at = COALESCE(notif_expired_at, now()),
           updated_at = now()
     WHERE id = r.id;
    v_exp := v_exp + 1;
  END LOOP;
  RETURN jsonb_build_object('expired', v_exp);
END;
$function$;

-- 4. Artist application approval: silence the welcome push (was auto-spammy too).
CREATE OR REPLACE FUNCTION public.on_artist_application_reviewed()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_slug text; v_base text; v_i int := 0;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.user_id, 'artist'::public.app_role) ON CONFLICT DO NOTHING;

    v_base := regexp_replace(lower(coalesce(NEW.stage_name,'artist')), '[^a-z0-9]+', '-', 'g');
    v_base := trim(both '-' from v_base);
    IF v_base = '' THEN v_base := 'artist'; END IF;
    v_slug := v_base;
    WHILE EXISTS (SELECT 1 FROM public.artist_profiles WHERE slug = v_slug) LOOP
      v_i := v_i + 1; v_slug := v_base || '-' || v_i::text;
    END LOOP;

    INSERT INTO public.artist_profiles(user_id, stage_name, slug, avatar_url, country_code, social_links, is_verified)
    VALUES (NEW.user_id, NEW.stage_name, v_slug, NEW.artist_photo_path,
            NEW.country_code, NEW.social_links, true)
    ON CONFLICT (user_id) DO UPDATE
      SET stage_name = EXCLUDED.stage_name, is_verified = true, updated_at = now();

    NEW.id_doc_front_path := NULL; NEW.id_doc_back_path := NULL; NEW.selfie_path := NULL;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  ELSIF NEW.status = 'rejected' THEN
    NEW.id_doc_front_path := NULL; NEW.id_doc_back_path := NULL; NEW.selfie_path := NULL;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  END IF;
  RETURN NEW;
END $function$;
