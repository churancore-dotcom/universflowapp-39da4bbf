import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ID_DOC_LABELS, IdDocType } from '@/lib/artist';

type App = {
  id: string;
  user_id: string;
  stage_name: string;
  real_name: string;
  phone: string;
  country_code: string;
  social_links: Record<string, any> | null;
  id_doc_type: IdDocType;
  id_doc_front_path: string | null;
  id_doc_back_path: string | null;
  selfie_path: string | null;
  artist_photo_path: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
};

async function signed(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('artist-kyc').createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

export default function ArtistApplications() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<App | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<{ front?: string; back?: string; selfie?: string }>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('artist_applications')
      .select('id, user_id, stage_name, real_name, phone, country_code, social_links, id_doc_type, id_doc_front_path, id_doc_back_path, selfie_path, artist_photo_path, status, created_at')
      .order('created_at', { ascending: false });
    setApps(((data ?? []) as any[]).map((a) => ({ ...a, admin_note: null })) as App[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openReview = async (app: App) => {
    setActive(app);
    // admin_note is fetched on demand via the admin RPC so the column stays
    // hidden from regular signed-in users at the database level.
    let currentNote: string | null = null;
    try {
      const { data: note } = await (supabase.rpc as any)('admin_get_artist_application_note', { _app_id: app.id });
      currentNote = (note as string | null) ?? null;
    } catch { /* ignore */ }
    setNote(currentNote ?? '');
    setPreviews({});
    const [front, back, selfie] = await Promise.all([
      signed(app.id_doc_front_path),
      signed(app.id_doc_back_path),
      signed(app.selfie_path),
    ]);
    setPreviews({ front: front ?? undefined, back: back ?? undefined, selfie: selfie ?? undefined });
  };

  const review = async (status: 'approved' | 'rejected') => {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase
      .from('artist_applications')
      .update({ status, admin_note: note.trim() || null })
      .eq('id', active.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Application ${status}`);
    setActive(null);
    load();
  };

  const pending = apps.filter((a) => a.status === 'pending');
  const reviewed = apps.filter((a) => a.status !== 'pending');

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Artist Applications</h1>
        <p className="text-sm text-muted-foreground">Review KYC, approve or reject verification requests.</p>
      </header>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-2">
            Pending · {pending.length}
          </h2>
          <div className="space-y-2">
            {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending applications.</p>}
            {pending.map((a) => <Row key={a.id} app={a} onClick={() => openReview(a)} />)}
          </div>

          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mt-8 mb-2">
            Reviewed · {reviewed.length}
          </h2>
          <div className="space-y-2">
            {reviewed.map((a) => <Row key={a.id} app={a} onClick={() => openReview(a)} />)}
          </div>
        </>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{active?.stage_name}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Legal name" value={active.real_name} />
                <Info label="Phone" value={active.phone} />
                <Info label="Country" value={active.country_code} />
                <Info label="Doc type" value={ID_DOC_LABELS[active.id_doc_type]} />
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Social links</p>
                <ul className="text-sm space-y-1">
                  {Object.entries(active.social_links || {}).filter(([, v]) => !!v).map(([k, v]) => (
                    <li key={k}><span className="text-muted-foreground capitalize">{k}:</span> <a href={String(v)} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">{String(v)} <ExternalLink className="w-3 h-3" /></a></li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <DocPreview label="ID front" url={previews.front} />
                <DocPreview label="ID back" url={previews.back} />
                <DocPreview label="Selfie" url={previews.selfie} />
              </div>
              {active.artist_photo_path && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Artist photo</p>
                  <img src={active.artist_photo_path} alt="" className="w-32 h-32 rounded-2xl object-cover" />
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Admin note (shown to artist on rejection)</p>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </div>

              {active.status === 'pending' ? (
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" disabled={busy} onClick={() => review('rejected')}>
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => review('approved')}>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Status: <strong>{active.status}</strong></p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ app, onClick }: { app: App; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40">
          {app.artist_photo_path ? <img src={app.artist_photo_path} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{app.stage_name} <span className="text-muted-foreground text-xs">· {app.country_code}</span></p>
          <p className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleString()}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${app.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{app.status}</span>
      </div>
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function DocPreview({ label, url }: { label: string; url?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} className="w-full aspect-square object-cover rounded-xl border border-white/10" />
        </a>
      ) : (
        <div className="w-full aspect-square rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xs text-muted-foreground">deleted / none</div>
      )}
    </div>
  );
}
