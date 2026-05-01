
-- Private secrets table (no RLS policies = nobody but SECURITY DEFINER funcs can read)
CREATE TABLE IF NOT EXISTS public.internal_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies → table is locked down except via SECURITY DEFINER

-- Update notify_system_push to read the key from internal_secrets
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
  SELECT (value #>> '{}') INTO v_url FROM public.app_settings WHERE key = 'edge_send_system_push_url';
  SELECT value INTO v_key FROM public.internal_secrets WHERE key = 'service_role_key';

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE NOTICE 'notify_system_push: URL or key not configured';
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

REVOKE ALL ON FUNCTION public.notify_system_push(uuid[], text, text, text) FROM PUBLIC, anon, authenticated;
