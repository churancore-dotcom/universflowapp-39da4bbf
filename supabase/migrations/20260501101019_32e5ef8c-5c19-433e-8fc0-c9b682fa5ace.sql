
-- Track which expiry warnings have been sent to avoid duplicates
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS notif_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS notif_warn_3d_at timestamptz,
  ADD COLUMN IF NOT EXISTS notif_warn_1d_at timestamptz,
  ADD COLUMN IF NOT EXISTS notif_expired_at timestamptz;

-- Helper to enqueue a system push via pg_net (HTTP POST to edge function)
CREATE OR REPLACE FUNCTION public.notify_system_push(
  _user_ids uuid[],
  _title text,
  _body text,
  _deep_link text DEFAULT '/premium'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  -- Pull URL + service role from app_settings (set once via admin)
  SELECT (value #>> '{}') INTO v_url FROM public.app_settings WHERE key = 'edge_send_system_push_url';
  SELECT (value #>> '{}') INTO v_key FROM public.app_settings WHERE key = 'edge_service_role_key';

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE NOTICE 'notify_system_push: edge_send_system_push_url / edge_service_role_key not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'user_ids', to_jsonb(_user_ids),
      'title', _title,
      'body', _body,
      'deep_link', _deep_link
    )
  );
END;
$$;

-- Trigger: fire activation push when subscription becomes active premium
CREATE OR REPLACE FUNCTION public.on_premium_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_premium boolean := false;
  v_is_premium  boolean;
BEGIN
  v_is_premium := NEW.status = 'active'
    AND NEW.subscription_type IN ('premium_monthly','premium_yearly')
    AND (NEW.expires_at IS NULL OR NEW.expires_at > now());

  IF TG_OP = 'UPDATE' THEN
    v_was_premium := OLD.status = 'active'
      AND OLD.subscription_type IN ('premium_monthly','premium_yearly')
      AND (OLD.expires_at IS NULL OR OLD.expires_at > now());
  END IF;

  -- Only notify on the transition free->premium OR a renewal extending expiry
  IF v_is_premium AND (NOT v_was_premium OR NEW.expires_at IS DISTINCT FROM OLD.expires_at) THEN
    IF NEW.notif_activated_at IS NULL
       OR NEW.notif_activated_at < now() - interval '5 minutes' THEN
      PERFORM public.notify_system_push(
        ARRAY[NEW.user_id],
        '👑 Welcome to Premium',
        'Your Premium is live. Unlimited downloads, zero ads, studio-grade audio — enjoy the best of UniversFlow.',
        '/premium'
      );
      NEW.notif_activated_at := now();
      -- Reset warning flags so renewal triggers warnings again
      NEW.notif_warn_3d_at := NULL;
      NEW.notif_warn_1d_at := NULL;
      NEW.notif_expired_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_premium_activated ON public.user_subscriptions;
CREATE TRIGGER trg_on_premium_activated
  BEFORE INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.on_premium_activated();

-- Periodic job: send 3-day and 1-day warnings + expiry notice
CREATE OR REPLACE FUNCTION public.process_premium_expiry_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_warn3 int := 0;
  v_warn1 int := 0;
  v_exp int := 0;
BEGIN
  -- 3-day warning
  FOR r IN
    SELECT user_id, expires_at
    FROM public.user_subscriptions
    WHERE status = 'active'
      AND subscription_type IN ('premium_monthly','premium_yearly')
      AND expires_at IS NOT NULL
      AND expires_at > now()
      AND expires_at <= now() + interval '3 days'
      AND expires_at >  now() + interval '1 day'
      AND notif_warn_3d_at IS NULL
  LOOP
    PERFORM public.notify_system_push(
      ARRAY[r.user_id],
      '⏳ Premium expires in 3 days',
      'Your Premium ends on ' || to_char(r.expires_at, 'Mon DD') || '. Renew now to keep ad-free, studio-grade audio.',
      '/premium'
    );
    UPDATE public.user_subscriptions SET notif_warn_3d_at = now() WHERE user_id = r.user_id;
    v_warn3 := v_warn3 + 1;
  END LOOP;

  -- 1-day warning
  FOR r IN
    SELECT user_id, expires_at
    FROM public.user_subscriptions
    WHERE status = 'active'
      AND subscription_type IN ('premium_monthly','premium_yearly')
      AND expires_at IS NOT NULL
      AND expires_at > now()
      AND expires_at <= now() + interval '1 day'
      AND notif_warn_1d_at IS NULL
  LOOP
    PERFORM public.notify_system_push(
      ARRAY[r.user_id],
      '⚠️ Premium expires tomorrow',
      'Last day of Premium. Renew in one tap to keep your favourites, downloads and crystal-clear audio.',
      '/premium'
    );
    UPDATE public.user_subscriptions SET notif_warn_1d_at = now() WHERE user_id = r.user_id;
    v_warn1 := v_warn1 + 1;
  END LOOP;

  -- Expiry: downgrade and notify
  FOR r IN
    SELECT user_id, expires_at
    FROM public.user_subscriptions
    WHERE status = 'active'
      AND subscription_type IN ('premium_monthly','premium_yearly')
      AND expires_at IS NOT NULL
      AND expires_at < now()
      AND notif_expired_at IS NULL
  LOOP
    UPDATE public.user_subscriptions
       SET status = 'expired',
           notif_expired_at = now(),
           updated_at = now()
     WHERE user_id = r.user_id;

    PERFORM public.notify_system_push(
      ARRAY[r.user_id],
      'Your Premium has ended',
      'Thanks for being Premium. Renew anytime to bring back zero-ads, downloads, and studio-grade audio.',
      '/premium'
    );
    v_exp := v_exp + 1;
  END LOOP;

  RETURN jsonb_build_object('warn_3d', v_warn3, '1d', v_warn1, 'expired', v_exp);
END;
$$;

-- Schedule it every 15 minutes (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('premium-expiry-notifier');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'premium-expiry-notifier',
  '*/15 * * * *',
  $$ SELECT public.process_premium_expiry_notifications(); $$
);
