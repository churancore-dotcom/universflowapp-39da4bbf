-- Create friends table for friend requests and connections
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their friend requests"
  ON public.friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend requests sent to them"
  ON public.friends FOR UPDATE
  USING (auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships"
  ON public.friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create song_dedications table
CREATE TABLE public.song_dedications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  song_id UUID NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.song_dedications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view dedications sent to them"
  ON public.song_dedications FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send dedications"
  ON public.song_dedications FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark dedications as read"
  ON public.song_dedications FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Add share_code to profiles for shareable profile links
ALTER TABLE public.profiles ADD COLUMN share_code TEXT UNIQUE;

-- Generate share codes for existing profiles
UPDATE public.profiles SET share_code = SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8) WHERE share_code IS NULL;

-- Add trigger for updated_at on friends
CREATE TRIGGER update_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for dedications
ALTER PUBLICATION supabase_realtime ADD TABLE public.song_dedications;