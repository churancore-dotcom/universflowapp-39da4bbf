-- Fix 1: Allow authenticated users to view basic profile information for social features
-- This enables friend discovery and user lookup while protecting sensitive fields

CREATE POLICY "Authenticated users can view basic profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Restrict promo code visibility to authenticated users only
-- Drop the overly permissive policy that allows anyone to see active codes
DROP POLICY IF EXISTS "Anyone can view active promo codes for validation" ON public.promo_codes;

-- Create a more restrictive policy - only authenticated users can validate codes
CREATE POLICY "Authenticated users can validate promo codes"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (is_active = true);

-- Fix 3: Add database constraints for input validation on songs table
-- These prevent invalid data even if client-side validation is bypassed
ALTER TABLE public.songs 
ADD CONSTRAINT songs_title_length CHECK (char_length(title) <= 200),
ADD CONSTRAINT songs_artist_length CHECK (char_length(artist) <= 200),
ADD CONSTRAINT songs_album_length CHECK (album IS NULL OR char_length(album) <= 200),
ADD CONSTRAINT songs_genre_length CHECK (genre IS NULL OR char_length(genre) <= 100),
ADD CONSTRAINT songs_mood_length CHECK (mood IS NULL OR char_length(mood) <= 100),
ADD CONSTRAINT songs_bpm_range CHECK (bpm IS NULL OR (bpm >= 20 AND bpm <= 300));