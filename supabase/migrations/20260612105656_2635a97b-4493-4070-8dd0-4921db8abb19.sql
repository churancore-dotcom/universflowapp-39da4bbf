
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role and admins may modify these fields; clients cannot
  IF current_user = 'service_role' OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.email := OLD.email;
  END IF;
  IF NEW.share_code IS DISTINCT FROM OLD.share_code THEN
    NEW.share_code := OLD.share_code;
  END IF;
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_sensitive_change_trg ON public.profiles;
CREATE TRIGGER prevent_profile_sensitive_change_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_sensitive_change();
