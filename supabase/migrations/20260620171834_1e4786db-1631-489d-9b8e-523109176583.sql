
-- Extend artist_profiles trigger to also lock stage_name for non-privileged users
CREATE OR REPLACE FUNCTION public.prevent_artist_profile_privileged_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_jwt_role text;
BEGIN
  BEGIN v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN v_jwt_role := NULL; END;

  IF v_jwt_role = 'service_role'
     OR current_user IN ('service_role','postgres','supabase_admin')
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  NEW.is_verified := OLD.is_verified;
  NEW.total_plays := OLD.total_plays;
  NEW.total_likes := OLD.total_likes;
  NEW.total_followers := OLD.total_followers;
  -- Locked identity fields: artists cannot change these themselves after verification
  NEW.stage_name := OLD.stage_name;
  NEW.country_code := OLD.country_code;
  NEW.slug := OLD.slug;
  RETURN NEW;
END $function$;

-- Extend artist_applications trigger so applicants can't tamper with phone/country/stage/real_name
CREATE OR REPLACE FUNCTION public.prevent_artist_application_privileged_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_jwt_role text;
BEGIN
  BEGIN v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN v_jwt_role := NULL; END;

  IF v_jwt_role = 'service_role'
     OR current_user IN ('service_role','postgres','supabase_admin')
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  NEW.status         := OLD.status;
  NEW.admin_note     := OLD.admin_note;
  NEW.reviewed_by    := OLD.reviewed_by;
  NEW.reviewed_at    := OLD.reviewed_at;
  -- Locked identity fields: applicants cannot change these after submitting
  NEW.stage_name     := OLD.stage_name;
  NEW.real_name      := OLD.real_name;
  NEW.phone          := OLD.phone;
  NEW.country_code   := OLD.country_code;
  RETURN NEW;
END;
$function$;
