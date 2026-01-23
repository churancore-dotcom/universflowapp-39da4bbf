-- Create promo codes table for premium access
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track code redemptions
CREATE TABLE public.code_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, promo_code_id)
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;

-- Promo codes policies
CREATE POLICY "Admins can manage promo codes"
ON public.promo_codes FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Anyone can view active promo codes for validation"
ON public.promo_codes FOR SELECT
USING (is_active = true);

-- Code redemptions policies
CREATE POLICY "Users can view their own redemptions"
ON public.code_redemptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can redeem codes"
ON public.code_redemptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
ON public.code_redemptions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
));