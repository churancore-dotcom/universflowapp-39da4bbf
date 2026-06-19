
-- Opt-out flag (default ON)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mood_pushes_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_mood_push_at timestamptz;
