CREATE OR REPLACE FUNCTION public.notify_system_push(_user_ids uuid[], _title text, _body text, _deep_link text DEFAULT '/premium'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
  v_token text;
BEGIN
  SELECT (value #>> '{}') INTO v_url FROM public.app_settings WHERE key = 'edge_send_system_push_url';
  SELECT value INTO v_token FROM public.internal_secrets WHERE key = 'system_push_token';

  IF v_url IS NULL OR v_token IS NULL THEN
    RAISE NOTICE 'notify_system_push: URL or token not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'user_ids', to_jsonb(_user_ids),
      'title', _title,
      'body', _body,
      'deep_link', _deep_link,
      'system_token', v_token
    ),
    timeout_milliseconds := 25000
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_system_push(uuid[], text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_system_push(uuid[], text, text, text) TO service_role;