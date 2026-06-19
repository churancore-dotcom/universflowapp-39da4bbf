
CREATE TABLE IF NOT EXISTS public.perf_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  track_id TEXT,
  source TEXT,
  latency_ms INTEGER,
  message TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_agent TEXT,
  route TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS perf_events_created_at_idx ON public.perf_events (created_at DESC);
CREATE INDEX IF NOT EXISTS perf_events_event_type_idx ON public.perf_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS perf_events_severity_idx ON public.perf_events (severity, created_at DESC);

GRANT INSERT ON public.perf_events TO authenticated, anon;
GRANT SELECT ON public.perf_events TO authenticated;
GRANT ALL ON public.perf_events TO service_role;

ALTER TABLE public.perf_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert their own perf events"
  ON public.perf_events FOR INSERT
  TO authenticated, anon
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can read all perf events"
  ON public.perf_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.perf_events;
