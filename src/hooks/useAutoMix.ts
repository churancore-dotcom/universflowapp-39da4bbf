import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AutoMixTrack {
  track_id: string;
  title: string;
  artist: string;
  cover_url: string | null;
}

export interface AutoMix {
  id: string;
  kind: "radio" | "daily_mix" | "discover_mix";
  title: string;
  subtitle: string | null;
  tracks: AutoMixTrack[];
  cover_urls: string[];
  generated_at: string;
  expires_at: string;
}

export function useAutoMix() {
  const { user } = useAuth();
  const [mixes, setMixes] = useState<AutoMix[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setMixes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("auto_playlists" as never)
      .select("id, kind, title, subtitle, tracks, cover_urls, generated_at, expires_at")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("generated_at", { ascending: false })
      .limit(6);
    setMixes((data || []) as unknown as AutoMix[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  return { mixes, loading, reload: load };
}
