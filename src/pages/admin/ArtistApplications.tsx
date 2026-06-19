import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ID_DOC_LABELS, IdDocType } from '@/lib/artist';

type Status = 'pending' | 'approved' | 'rejected';

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
  status: Status;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type PreviewMap = {
  front?: string;
  back?: string;
  selfie?: string;
  center?: string;
  left?: string;
  right?: string;
  up?: string;
};

async function signed(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('artist-kyc').createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

export default function ArtistApplications() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [active, setActive] = useState<App | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<PreviewMap>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('artist_applications')
      .select('id, user_id, stage_name, real_name, phone, country_code, social_links, id_doc_type, id_doc_front_path, id_doc_back_path, selfie_path, artist_photo_path, status, reviewed_at, created_at')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setApps(((data ?? []) as any[]).map((a) => ({ ...a, admin_note: null })) as App[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('admin-artist-applications-review')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_applications' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const counts = useMemo(() => ({
    all: apps.length,
    pending: apps.filter((a) => a.status === 'pending').length,
    approved: apps.filter((a) => a.status === 'approved').length,
    rejected: apps.filter((a) => a.status === 'rejected').length,
  }), [apps]);

  const filtered = filter === 'all' ? apps : apps.filter((a) => a.status === filter);

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
    const face = ((app.social_links as any)?.face_shots ?? []) as string[];
    const [front, back, selfie, center, left, right, up] = await Promise.all([
      signed(app.id_doc_front_path),
      signed(app.id_doc_back_path),
      signed(app.selfie_path),
      signed(face[0]),
      signed(face[1]),
      signed(face[2]),
      signed(face[3]),
    ]);
    setPreviews({
      front: front ?? undefined,
      back: back ?? undefined,
      selfie: selfie ?? undefined,
      center: center ?? undefined,
      left: left ?? undefined,
      right: right ?? undefined,
      up: up ?? undefined,
    });
  };

  const review = async (status: Exclude<Status, 'pending'>) => {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase
      .from('artist_applications')
      .update({ status, admin_note: note.trim() || null })
      .eq('id', active.id);
    setBusy(false);
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success(status === 'approved' ? 'Artist verified and artist dashboard unlocked' : 'Application rejected');
    setActive(null);
    load();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Artist verification desk
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Artist Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">Review identity documents, face liveness shots, social proof, and approve artist access.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Metric icon={<Clock className="w-4 h-4" />} label="Pending" value={counts.pending} active={filter === 'pending'} onClick={() => setFilter('pending')} />
        <Metric icon={<UserCheck className="w-4 h-4" />} label="Approved" value={counts.approved} active={filter === 'approved'} onClick={() => setFilter('approved')} />
        <Metric icon={<XCircle className="w-4 h-4" />} label="Rejected" value={counts.rejected} active={filter === 'rejected'} onClick={() => setFilter('rejected')} />
        <Metric icon={<FileCheck2 className="w-4 h-4" />} label="All" value={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
      </div>

      {loading ? (
        <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {filter === 'all' ? 'All applications' : `${filter} applications`} · {filtered.length}
              </h2>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {filtered.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">No applications in this queue.</div>
              )}
              {filtered.map((a) => <Row key={a.id} app={a} onClick={() => openReview(a)} />)}
            </div>
          </section>

          <aside className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" /> Review checklist</h3>
            <ChecklistItem label="Legal name and ID match" />
            <ChecklistItem label="ID front/back are readable" />
            <ChecklistItem label="Selfie matches ID photo" />
            <ChecklistItem label="4 face-check poses are present" />
            <ChecklistItem label="Social links prove artist identity" />
            <div className="pt-3 border-t border-white/[0.06] text-xs text-muted-foreground leading-relaxed">
              Approval grants the artist role, creates/updates the artist profile, verifies the public profile, and unlocks Artist Studio pages.
            </div>
          </aside>
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {active?.artist_photo_path ? <img src={active.artist_photo_path} alt="" className="w-10 h-10 rounded-xl object-cover" /> : null}
              <span>{active?.stage_name}</span>
              {active ? <StatusBadge status={active.status} /> : null}
            </DialogTitle>
          </DialogHeader>
          {active && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
              <div className="space-y-5">
                <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <h3 className="font-semibold mb-3">Identity details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <Info label="Legal name" value={active.real_name} />
                    <Info label="Phone" value={active.phone} />
                    <Info label="Country" value={active.country_code} />
                    <Info label="Doc type" value={ID_DOC_LABELS[active.id_doc_type]} />
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><FileCheck2 className="w-4 h-4" /> Documents</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <DocPreview label="ID front" url={previews.front} />
                    <DocPreview label="ID back" url={previews.back} />
                    <DocPreview label="Selfie with ID" url={previews.selfie} />
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Camera className="w-4 h-4" /> Face liveness check</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <DocPreview label="Front" url={previews.center} />
                    <DocPreview label="Turn left" url={previews.left} />
                    <DocPreview label="Turn right" url={previews.right} />
                    <DocPreview label="Look up" url={previews.up} />
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <h3 className="font-semibold mb-3">Artist profile preview</h3>
                  {active.artist_photo_path ? <img src={active.artist_photo_path} alt="Artist profile" className="w-full aspect-square rounded-2xl object-cover mb-3" /> : <div className="w-full aspect-square rounded-2xl bg-white/[0.04] flex items-center justify-center mb-3"><ImageIcon className="w-8 h-8 text-muted-foreground" /></div>}
                  <p className="text-lg font-semibold">{active.stage_name}</p>
                  <p className="text-xs text-muted-foreground">Submitted {new Date(active.created_at).toLocaleString()}</p>
                </section>

                <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <h3 className="font-semibold mb-3">Social proof</h3>
                  <ul className="text-sm space-y-2">
                    {Object.entries(active.social_links || {}).filter(([k, v]) => !!v && k !== 'face_shots').map(([k, v]) => (
                      <li key={k} className="flex items-start gap-2">
                        <span className="text-muted-foreground capitalize min-w-20">{k.replace('_', ' ')}</span>
                        {String(v).startsWith('http') ? (
                          <a href={String(v)} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1 break-all">Open <ExternalLink className="w-3 h-3" /></a>
                        ) : <span className="break-words">{String(v)}</span>}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Admin note</p>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Required if rejecting. Visible to artist." />
                </section>

                {active.status === 'pending' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" disabled={busy} onClick={() => review('rejected')}>
                      <XCircle className="w-4 h-4 mr-1.5" /> Reject
                    </Button>
                    <Button disabled={busy} onClick={() => review('approved')}>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-muted-foreground">
                    Reviewed {active.reviewed_at ? new Date(active.reviewed_at).toLocaleString() : 'earlier'} · {active.status}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon, label, value, active, onClick }: { icon: React.ReactNode; label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`text-left rounded-2xl border p-4 transition ${active ? 'border-primary/40 bg-primary/10' : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]'}`}>
      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
        <span>{label}</span>{icon}
      </div>
      <p className="text-2xl font-semibold mt-2 tabular-nums">{value}</p>
    </button>
  );
}

function ChecklistItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5" /></div>
      <span>{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${status === 'pending' ? 'bg-amber-500/20 text-amber-300' : status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{status}</span>
  );
}

function Row({ app, onClick }: { app: App; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left p-4 hover:bg-white/[0.04] transition">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 shrink-0">
          {app.artist_photo_path ? <img src={app.artist_photo_path} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{app.stage_name} <span className="text-muted-foreground text-xs">· {app.country_code}</span></p>
          <p className="text-xs text-muted-foreground truncate">{app.real_name} · {new Date(app.created_at).toLocaleString()}</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <FileCheck2 className="w-4 h-4" /> ID
          <Camera className="w-4 h-4 ml-2" /> Face
        </div>
        <StatusBadge status={app.status} />
      </div>
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="break-words">{value}</p>
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
        <div className="w-full aspect-square rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xs text-muted-foreground text-center px-2">deleted / none</div>
      )}
    </div>
  );
}
