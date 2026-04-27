import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Info, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/hooks/useHaptics';
import { markAllAnnouncementsSeen, getSeenAnnouncementIds } from '@/lib/announcementSeen';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  target_audience: 'all' | 'premium' | 'free';
  created_at: string;
}

const typeIcon = (t: string) => t === 'success' ? CheckCircle2 : t === 'warning' ? AlertTriangle : Info;
const typeColor = (t: string) => t === 'success' ? 'hsl(145 80% 50%)' : t === 'warning' ? 'hsl(40 100% 55%)' : 'hsl(var(--primary))';

const timeAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const seenAtMountRef = useRef<Set<string>>(getSeenAnnouncementIds());

  const recordEvent = useCallback(async (announcementId: string, eventType: 'delivered' | 'opened' | 'clicked') => {
    if (!user) return;
    try {
      await supabase.from('announcement_events').insert({
        announcement_id: announcementId,
        user_id: user.id,
        event_type: eventType,
      });
    } catch { /* ignore */ }
  }, [user]);

  const fetchAnnouncements = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
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
      .select('id, title, message, type, target_audience, created_at, ends_at')
      .eq('is_active', true)
      .lte('starts_at', nowIso)
      .in('target_audience', audienceFilter)
      .order('created_at', { ascending: false })
      .limit(50);

    const filtered = (data || []).filter(a => !a.ends_at || new Date(a.ends_at) > new Date()) as Announcement[];
    setItems(filtered);
    setLoading(false);

    // Mark all as opened (clears the red dot)
    if (filtered.length) {
      markAllAnnouncementsSeen(filtered.map(a => a.id));
      for (const a of filtered) {
        if (!seenAtMountRef.current.has(a.id)) {
          recordEvent(a.id, 'opened');
        }
      }
    }
  }, [user, recordEvent]);

  useEffect(() => {
    fetchAnnouncements();
    const ch = supabase
      .channel('user_notifications_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAnnouncements)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAnnouncements]);

  const handleClick = (id: string) => {
    triggerHaptic('impactLight');
    recordEvent(id, 'clicked');
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="flex items-center gap-3 px-4 py-3 pt-safe">
          <button
            onClick={() => { triggerHaptic('impactLight'); navigate(-1); }}
            className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </h1>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading…' : items.length === 0 ? 'No notifications yet' : `${items.length} ${items.length === 1 ? 'update' : 'updates'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-2.5">
        {loading ? (
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted/30 mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="text-base font-bold mb-1">You're all caught up</p>
            <p className="text-sm text-muted-foreground">New announcements will appear here.</p>
          </div>
        ) : items.map((a, idx) => {
          const Icon = typeIcon(a.type);
          const color = typeColor(a.type);
          return (
            <motion.button
              key={a.id}
              onClick={() => handleClick(a.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="w-full text-left rounded-2xl p-4 bg-muted/30 border border-border/40 active:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}20`, color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-bold leading-tight">{a.title}</p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5 whitespace-nowrap">{timeAgo(a.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{a.message}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
