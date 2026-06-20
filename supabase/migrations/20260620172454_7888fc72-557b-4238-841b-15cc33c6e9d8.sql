
-- 1) Add auto-verification columns to artist_applications
ALTER TABLE public.artist_applications
  ADD COLUMN IF NOT EXISTS phone_hash text,
  ADD COLUMN IF NOT EXISTS id_image_hash text,
  ADD COLUMN IF NOT EXISTS face_match_score real,
  ADD COLUMN IF NOT EXISTS face_match_status text,
  ADD COLUMN IF NOT EXISTS ocr_extracted_name text,
  ADD COLUMN IF NOT EXISTS name_match_score real,
  ADD COLUMN IF NOT EXISTS auto_check_warnings jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_checks_at timestamptz;

-- 2) Column grants: applicant can write hashes at insert; admin/service read all results.
-- We allow authenticated to SELECT only the safe verification result columns (no raw hashes).
GRANT SELECT (
  face_match_score, face_match_status, ocr_extracted_name,
  name_match_score, auto_check_warnings, auto_checks_at
) ON public.artist_applications TO authenticated;

-- Applicant needs to INSERT phone_hash and id_image_hash at submit time.
-- (Existing insert path uses RLS; we just need column-level insert privilege.)
GRANT INSERT (phone_hash, id_image_hash) ON public.artist_applications TO authenticated;

-- 3) Indexes for duplicate detection lookups
CREATE INDEX IF NOT EXISTS idx_artist_apps_phone_hash_active
  ON public.artist_applications (phone_hash)
  WHERE status IN ('pending','approved') AND phone_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_artist_apps_id_hash_active
  ON public.artist_applications (id_image_hash)
  WHERE status IN ('pending','approved') AND id_image_hash IS NOT NULL;

-- 4) Trigger: 7-day cooldown after rejection + duplicate detection by phone/ID hash
CREATE OR REPLACE FUNCTION public.enforce_artist_application_anti_abuse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_rejected timestamptz;
  v_dup_user uuid;
BEGIN
  -- Cooldown: if this user was rejected in the last 7 days, block re-apply.
  SELECT MAX(COALESCE(reviewed_at, updated_at)) INTO v_last_rejected
  FROM public.artist_applications
  WHERE user_id = NEW.user_id AND status = 'rejected';

  IF v_last_rejected IS NOT NULL AND v_last_rejected > now() - interval '7 days' THEN
    RAISE EXCEPTION 'You can re-apply 7 days after a rejection. Next attempt allowed after %.',
      to_char(v_last_rejected + interval '7 days', 'YYYY-MM-DD HH24:MI UTC')
      USING ERRCODE = '22023';
  END IF;

  -- Duplicate phone hash on another user (pending/approved).
  IF NEW.phone_hash IS NOT NULL THEN
    SELECT user_id INTO v_dup_user
    FROM public.artist_applications
    WHERE phone_hash = NEW.phone_hash
      AND status IN ('pending','approved')
      AND user_id <> NEW.user_id
    LIMIT 1;
    IF v_dup_user IS NOT NULL THEN
      RAISE EXCEPTION 'This phone number is already linked to another artist account on Universflow.'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  -- Duplicate ID image hash on another user (pending/approved).
  IF NEW.id_image_hash IS NOT NULL THEN
    SELECT user_id INTO v_dup_user
    FROM public.artist_applications
    WHERE id_image_hash = NEW.id_image_hash
      AND status IN ('pending','approved')
      AND user_id <> NEW.user_id
    LIMIT 1;
    IF v_dup_user IS NOT NULL THEN
      RAISE EXCEPTION 'This ID document is already linked to another artist account on Universflow.'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_artist_application_anti_abuse ON public.artist_applications;
CREATE TRIGGER trg_enforce_artist_application_anti_abuse
BEFORE INSERT ON public.artist_applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_artist_application_anti_abuse();
