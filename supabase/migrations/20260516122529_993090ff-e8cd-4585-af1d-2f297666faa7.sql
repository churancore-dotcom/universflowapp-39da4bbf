-- Remove playlist sharing infrastructure completely

-- Drop functions first (they reference share_token)
DROP FUNCTION IF EXISTS public.get_or_create_playlist_share_token(uuid);
DROP FUNCTION IF EXISTS public.import_shared_playlist(text);

-- Drop ALL RLS policies that reference share_token (use CASCADE to handle dependencies)
DROP POLICY IF EXISTS "Public can view shared playlists" ON public.playlists;
DROP POLICY IF EXISTS "Anyone can view shared playlists" ON public.playlists;
DROP POLICY IF EXISTS "Anyone can view songs of shared playlists" ON public.playlist_songs;

-- Drop the index on share_token
DROP INDEX IF EXISTS idx_playlists_share_token;

-- Remove the share_token column from playlists (CASCADE to drop any remaining dependent policies)
ALTER TABLE public.playlists DROP COLUMN IF EXISTS share_token CASCADE;
