import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/hooks/useHaptics';
import { getSeenAnnouncementIds } from '@/lib/announcementSeen';

interface Announcement {
  id: string;
  created_at: string;
  ends_at: string | null;
  target_audience: 'all' | 'premium' | 'free';
}

const AnnouncementBell = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [seenVersion, setSeenVersion] = useState(0);

  const recordDelivered = useCallback(async (announcementId: string) => {
    if (!user) return;
    try {
      await supabase.from('announcement_events').insert({
        announcement_id: announcementId,
        user_id: user.id,
        event_type: 'delivered',
      });
    } catch { /* ignore */ }
  }, [user]);

  const fetchAnnouncements = useCallback(async () => {
    if (!user) { setItems([]); return; }
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('subscription_type, status, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    const isPremium = sub && sub.status === 'active' &&
      sub.subscription_type !== 'free' &&
      (!sub.expires_at || new Date(sub.expires_at) > new Date());
    const audienceFilter = isPremium ? ['all', 'premium'] : ['all', 'free'];

    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from('announcements')
      .select('id, created_at, ends_at, target_audience')
      .eq('is_active', true)
      .lte('starts_at', nowIso)
      .in('target_audience', audienceFilter)
      .order('created_at', { ascending: false })
      .limit(20);

    const filtered = (data || []).filter(a => !a.ends_at || new Date(a.ends_at) > new Date()) as Announcement[];
    setItems(filtered);

    // Record delivered once per announcement (best-effort)
    const seen = getSeenAnnouncementIds();
    for (const a of filtered) {
      if (!seen.has(a.id)) recordDelivered(a.id);
    }
  }, [user, recordDelivered]);

  useEffect(() => {
    fetchAnnouncements();
    const ch = supabase
      .channel('announcement_bell_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAnnouncements)
      .subscribe();
    const onSeen = () => setSeenVersion(v => v + 1);
    window.addEventListener('uf:announcements-seen', onSeen);
    window.addEventListener('storage', onSeen);
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener('uf:announcements-seen', onSeen);
      window.removeEventListener('storage', onSeen);
    };
  }, [fetchAnnouncements]);

  // Recompute unread whenever items or seen state changes
  const seen = getSeenAnnouncementIds();
  void seenVersion; // re-run on bump
  const unreadCount = items.filter(i => !seen.has(i.id)).length;

  const handleOpen = () => {
    triggerHaptic('impactLight');
    navigate('/notifications');
  };

  if (!user) return null;

  return (
    <button
      onClick={handleOpen}
      className="relative w-9 h-9 rounded-full bg-muted/40 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform"
      aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}
    </button>
  );
};

export default AnnouncementBell;
