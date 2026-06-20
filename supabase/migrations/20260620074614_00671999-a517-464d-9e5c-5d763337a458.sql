
-- Lock down recipient-side updates with BEFORE UPDATE triggers that revert any
-- column the recipient is not allowed to change. RLS WITH CHECK can't reference
-- OLD, so we enforce column-level restrictions via SECURITY DEFINER triggers.

CREATE OR REPLACE FUNCTION public.prevent_friends_recipient_column_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_jwt_role text;
BEGIN
  BEGIN v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN v_jwt_role := NULL; END;

  -- Privileged callers bypass
  IF v_jwt_role = 'service_role'
     OR current_user IN ('service_role','postgres','supabase_admin')
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- The original requester (user_id) is allowed to change anything their RLS allows.
  -- The recipient (friend_id) may only change `status` (and updated_at if present).
  IF auth.uid() = OLD.friend_id AND auth.uid() IS DISTINCT FROM OLD.user_id THEN
    NEW.user_id   := OLD.user_id;
    NEW.friend_id := OLD.friend_id;
    -- Preserve every other column except `status` (and timestamps managed by triggers)
    IF to_jsonb(NEW) ? 'created_at' THEN
      NEW.created_at := OLD.created_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_friends_recipient_column_change ON public.friends;
CREATE TRIGGER trg_prevent_friends_recipient_column_change
BEFORE UPDATE ON public.friends
FOR EACH ROW EXECUTE FUNCTION public.prevent_friends_recipient_column_change();


CREATE OR REPLACE FUNCTION public.prevent_song_dedication_recipient_column_change()
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

  -- Recipient may only flip `is_read`. Preserve everything else.
  IF auth.uid() = OLD.recipient_id AND auth.uid() IS DISTINCT FROM OLD.sender_id THEN
    NEW.sender_id    := OLD.sender_id;
    NEW.recipient_id := OLD.recipient_id;
    NEW.song_id      := OLD.song_id;
    NEW.message      := OLD.message;
    IF to_jsonb(NEW) ? 'created_at' THEN
      NEW.created_at := OLD.created_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_song_dedication_recipient_column_change ON public.song_dedications;
CREATE TRIGGER trg_prevent_song_dedication_recipient_column_change
BEFORE UPDATE ON public.song_dedications
FOR EACH ROW EXECUTE FUNCTION public.prevent_song_dedication_recipient_column_change();
