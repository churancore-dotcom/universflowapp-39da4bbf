import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle2, XCircle, ArrowRight, RotateCw, LogOut } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { FadeTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getMyApplication, type ArtistAppStatus } from '@/lib/artist';
import { toast } from 'sonner';


export default function ArtistStatus() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const data = await getMyApplication(user.id);
    setApp(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }
    load();

    // Realtime — flip the page the moment admin approves
    const channel = supabase
      .channel('artist-app-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'artist_applications', filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  if (isLoading || loading) return <div className="min-h-[100dvh] bg-background" />;

  if (!app) {
    return (
      <FadeTransition>
        <Shell>
          <div className="text-center pt-20">
            <p className="text-muted-foreground text-[14px] mb-4">No artist application yet.</p>
            <Button onClick={() => navigate('/artist/apply')} style={{ background: '#FF2D55' }} className="text-white">
              Start application <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Shell>
      </FadeTransition>
    );
  }

  const status: ArtistAppStatus = app.status;

  const resetAndReapply = async () => {
    if (!user) return;
    const { error } = await supabase.from('artist_applications').delete().eq('user_id', user.id);
    if (error) { toast.error(error.message); return; }
    navigate('/artist/apply');
  };

  return (
    <FadeTransition>
      <SEOHead title="Artist Status — Universflow" description="Your Universflow artist application status." path="/artist/status" />
      <Shell>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 text-center"
          style={{
            background: 'rgba(16,16,18,0.78)',
            border: '0.5px solid rgba(255,255,255,0.07)',
          }}
        >
          {status === 'pending' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-amber-500/10 text-amber-400 mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-[20px] font-semibold mb-1.5">Under review</h2>
              <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                Hang tight — most artists are verified within 1 to 3 days. We'll send you a push the moment it's approved.
              </p>
            </>
          )}
          {status === 'approved' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400 mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-[20px] font-semibold mb-1.5">You're verified ✓</h2>
              <p className="text-[13.5px] text-muted-foreground leading-relaxed mb-5">
                Welcome to Universflow Artists. Your Studio is ready.
              </p>
              <Button
                className="w-full h-12 rounded-xl text-[14px] font-semibold text-white"
                style={{ background: '#FF2D55' }}
                onClick={() => navigate('/artist/studio')}
              >
                Open Artist Studio <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </>
          )}
          {status === 'rejected' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-rose-500/10 text-rose-400 mb-4">
                <XCircle className="w-8 h-8" />
              </div>
              <h2 className="text-[20px] font-semibold mb-1.5">Application needs changes</h2>
              {app.admin_note ? (
                <p className="text-[13.5px] text-muted-foreground leading-relaxed mb-4 px-2">
                  "{app.admin_note}"
                </p>
              ) : (
                <p className="text-[13.5px] text-muted-foreground leading-relaxed mb-4">
                  We couldn't verify your application. You can resubmit with corrected details.
                </p>
              )}
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl text-[14px] font-semibold"
                onClick={resetAndReapply}
              >
                <RotateCw className="w-4 h-4 mr-1.5" /> Re-apply
              </Button>
            </>
          )}
        </motion.div>

        <div className="mt-5 text-[11.5px] text-center text-muted-foreground/70">
          Submitted {new Date(app.created_at).toLocaleString()}
        </div>
      </Shell>
    </FadeTransition>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.04] active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[15px] font-semibold tracking-tight">Artist Application</h1>
        </div>
      </header>
      <main className="max-w-md mx-auto px-5 pt-8 pb-32">{children}</main>
    </div>
  );
}
