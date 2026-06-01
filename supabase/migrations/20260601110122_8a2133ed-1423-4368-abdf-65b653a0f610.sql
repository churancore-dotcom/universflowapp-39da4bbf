DROP FUNCTION IF EXISTS public.join_jam_room(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_jam_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_jam_host(uuid, uuid) CASCADE;
DROP TABLE IF EXISTS public.jam_queue_items CASCADE;
DROP TABLE IF EXISTS public.jam_room_members CASCADE;
DROP TABLE IF EXISTS public.jam_rooms CASCADE;