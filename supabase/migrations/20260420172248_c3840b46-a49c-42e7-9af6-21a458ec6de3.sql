-- User artist preferences (selected during onboarding)
CREATE TABLE public.user_artist_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  artist_name TEXT NOT NULL,
  artist_image TEXT,
  artist_source TEXT NOT NULL DEFAULT 'catalog', -- 'catalog' | 'lastfm' | 'audius'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, artist_name)
);

ALTER TABLE public.user_artist_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own artist prefs"
ON public.user_artist_preferences
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_artist_prefs_user ON public.user_artist_preferences(user_id);

-- App reviews (one per user)
CREATE TABLE public.app_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
ON public.app_reviews FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Users insert own review"
ON public.app_reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own review"
ON public.app_reviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage reviews"
ON public.app_reviews FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_app_reviews_updated_at
BEFORE UPDATE ON public.app_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_app_reviews_created ON public.app_reviews(created_at DESC);