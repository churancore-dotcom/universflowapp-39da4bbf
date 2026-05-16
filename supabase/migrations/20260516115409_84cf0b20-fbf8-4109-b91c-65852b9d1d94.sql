
-- Fix 1: audit_logs INSERT policy must reject NULL user_id
DROP POLICY IF EXISTS "Authenticated users can log their own events" ON public.audit_logs;
CREATE POLICY "Authenticated users can log their own events"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- Fix 2: Remove song_play_events from realtime publication (contains user_id + location;
-- only admins are supposed to read it, no client needs live updates).
ALTER PUBLICATION supabase_realtime DROP TABLE public.song_play_events;
