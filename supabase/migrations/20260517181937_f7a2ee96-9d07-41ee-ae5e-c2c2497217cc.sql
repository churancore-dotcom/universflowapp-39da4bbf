CREATE TABLE public.chart_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chart_type TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'GLOBAL',
  rank INTEGER NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  cover_url TEXT,
  source TEXT NOT NULL,
  external_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chart_tracks_lookup ON public.chart_tracks(chart_type, country_code, rank);
CREATE INDEX idx_chart_tracks_fetched_at ON public.chart_tracks(fetched_at DESC);

ALTER TABLE public.chart_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chart tracks"
ON public.chart_tracks FOR SELECT
USING (true);

CREATE POLICY "Admins can manage chart tracks"
ON public.chart_tracks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;