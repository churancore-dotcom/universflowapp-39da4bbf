
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_username text;
  v_country  text;
BEGIN
  v_username := NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'username', '')), '');
  v_country  := upper(left(NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'country_code', '')), ''), 2));

  INSERT INTO public.profiles (user_id, email, is_admin, username, country_code, username_changed)
  VALUES (
    NEW.id,
    NEW.email,
    false,
    v_username,
    v_country,
    v_username IS NOT NULL
  )
  ON CONFLICT (user_id) DO UPDATE
    SET username       = COALESCE(public.profiles.username, EXCLUDED.username),
        country_code   = COALESCE(public.profiles.country_code, EXCLUDED.country_code),
        username_changed = public.profiles.username_changed OR (EXCLUDED.username IS NOT NULL);

  RETURN NEW;
END;
$function$;
