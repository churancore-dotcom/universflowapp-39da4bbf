
-- ===== Tables =====
CREATE TABLE public.jam_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  host_user_id uuid NOT NULL,
  name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.jam_room_members (
  room_id uuid NOT NULL REFERENCES public.jam_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE public.jam_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.jam_rooms(id) ON DELETE CASCADE,
  added_by uuid NOT NULL,
  added_by_name text,
  position double precision NOT NULL DEFAULT extract(epoch FROM now()),
  song_id text,
  title text NOT NULL,
  artist text NOT NULL,
  cover_url text,
  audio_url text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jam_queue_items_room_pos_idx ON public.jam_queue_items (room_id, position);
CREATE INDEX jam_room_members_user_idx ON public.jam_room_members (user_id);
CREATE INDEX jam_rooms_code_idx ON public.jam_rooms (code) WHERE is_active = true;

-- ===== Grants =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jam_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jam_room_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jam_queue_items TO authenticated;
GRANT ALL ON public.jam_rooms TO service_role;
GRANT ALL ON public.jam_room_members TO service_role;
GRANT ALL ON public.jam_queue_items TO service_role;

-- ===== Security-definer helpers (avoid RLS recursion) =====
CREATE OR REPLACE FUNCTION public.is_jam_member(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jam_room_members
    WHERE room_id = _room_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_jam_host(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jam_rooms
    WHERE id = _room_id AND host_user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.join_jam_room(p_code text, p_display_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id INTO v_room_id
  FROM public.jam_rooms
  WHERE code = upper(trim(p_code)) AND is_active = true
  LIMIT 1;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Jam room not found';
  END IF;

  INSERT INTO public.jam_room_members (room_id, user_id, display_name)
  VALUES (v_room_id, v_user, p_display_name)
  ON CONFLICT (room_id, user_id) DO UPDATE
    SET display_name = COALESCE(EXCLUDED.display_name, public.jam_room_members.display_name);

  RETURN v_room_id;
END;
$$;

-- ===== RLS =====
ALTER TABLE public.jam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jam_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jam_queue_items ENABLE ROW LEVEL SECURITY;

-- jam_rooms
CREATE POLICY "Members can read their jam rooms"
  ON public.jam_rooms FOR SELECT TO authenticated
  USING (public.is_jam_member(id, auth.uid()) OR host_user_id = auth.uid());

CREATE POLICY "Authenticated can create jam rooms as host"
  ON public.jam_rooms FOR INSERT TO authenticated
  WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Host can update their jam room"
  ON public.jam_rooms FOR UPDATE TO authenticated
  USING (host_user_id = auth.uid())
  WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Host can delete their jam room"
  ON public.jam_rooms FOR DELETE TO authenticated
  USING (host_user_id = auth.uid());

-- jam_room_members
CREATE POLICY "Members can view fellow members"
  ON public.jam_room_members FOR SELECT TO authenticated
  USING (public.is_jam_member(room_id, auth.uid()));

CREATE POLICY "Users can insert their own membership"
  ON public.jam_room_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave (delete own membership)"
  ON public.jam_room_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_jam_host(room_id, auth.uid()));

CREATE POLICY "Users can update their own membership"
  ON public.jam_room_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- jam_queue_items
CREATE POLICY "Members can view queue"
  ON public.jam_queue_items FOR SELECT TO authenticated
  USING (public.is_jam_member(room_id, auth.uid()));

CREATE POLICY "Members can add to queue"
  ON public.jam_queue_items FOR INSERT TO authenticated
  WITH CHECK (public.is_jam_member(room_id, auth.uid()) AND added_by = auth.uid());

CREATE POLICY "Adder or host can remove queue item"
  ON public.jam_queue_items FOR DELETE TO authenticated
  USING (added_by = auth.uid() OR public.is_jam_host(room_id, auth.uid()));

CREATE POLICY "Host can reorder queue"
  ON public.jam_queue_items FOR UPDATE TO authenticated
  USING (public.is_jam_host(room_id, auth.uid()))
  WITH CHECK (public.is_jam_host(room_id, auth.uid()));

-- ===== Realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.jam_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jam_room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jam_queue_items;
ALTER TABLE public.jam_queue_items REPLICA IDENTITY FULL;
ALTER TABLE public.jam_room_members REPLICA IDENTITY FULL;
