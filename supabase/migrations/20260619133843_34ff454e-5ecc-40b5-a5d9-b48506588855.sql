
-- Tighten artist_applications self-update policy + add guard trigger
DROP POLICY IF EXISTS "artist_apps own update" ON public.artist_applications;

CREATE POLICY "artist_apps own update"
ON public.artist_applications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Guard trigger: applicants cannot modify privileged columns
CREATE OR REPLACE FUNCTION public.prevent_artist_application_privileged_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_jwt_role text;
BEGIN
  BEGIN v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN v_jwt_role := NULL; END;

  IF v_jwt_role = 'service_role'
     OR current_user IN ('service_role','postgres','supabase_admin')
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admins (i.e. the applicant) cannot change reviewer/status fields
  NEW.status         := OLD.status;
  NEW.admin_note     := OLD.admin_note;
  NEW.reviewed_by    := OLD.reviewed_by;
  NEW.reviewed_at    := OLD.reviewed_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_artist_application_privileged_change ON public.artist_applications;
CREATE TRIGGER trg_prevent_artist_application_privileged_change
BEFORE UPDATE ON public.artist_applications
FOR EACH ROW EXECUTE FUNCTION public.prevent_artist_application_privileged_change();
