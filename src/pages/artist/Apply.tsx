import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Upload, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';
import { FadeTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FaceLivenessCapture, { LivenessShots } from '@/components/FaceLivenessCapture';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ID_DOC_LABELS,
  IdDocType,
  docsForCountry,
  getMyApplication,
  uploadArtistPhoto,
  uploadKycFile,
} from '@/lib/artist';

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const TOTAL_STEPS = 6;

const COUNTRIES = [
  ['IN', '🇮🇳 India'],
  ['US', '🇺🇸 United States'],
  ['GB', '🇬🇧 United Kingdom'],
  ['CA', '🇨🇦 Canada'],
  ['AU', '🇦🇺 Australia'],
  ['DE', '🇩🇪 Germany'],
  ['FR', '🇫🇷 France'],
  ['JP', '🇯🇵 Japan'],
  ['BR', '🇧🇷 Brazil'],
  ['XX', '🌍 Other'],
] as const;

function FilePicker({
  label,
  file,
  onPick,
  accept = 'image/jpeg,image/png,image/webp',
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  accept?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">
        {label}
      </span>
      <div
        className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 flex items-center gap-3 active:bg-white/[0.06] transition"
      >
        {file ? (
          <>
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
              <img
                src={URL.createObjectURL(file)}
                alt="preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              type="button"
              className="text-[12px] text-primary px-2 py-1"
              onClick={() => onPick(null)}
            >
              Change
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-[13px] text-muted-foreground">Tap to choose photo</div>
          </>
        )}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>
    </label>
  );
}

export default function ArtistApply() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [bootChecked, setBootChecked] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [stageName, setStageName] = useState('');
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('IN');
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [spotify, setSpotify] = useState('');
  const [appleMusic, setAppleMusic] = useState('');

  const [docType, setDocType] = useState<IdDocType>('voter_id');
  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [livenessShots, setLivenessShots] = useState<LivenessShots | null>(null);

  // Bounce to status page if an application already exists. Otherwise prefill
  // fields the user already gave on the artist signup screen.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    (async () => {
      const existing = await getMyApplication(user.id);
      if (existing) {
        navigate('/artist/status', { replace: true });
        return;
      }
      try {
        const raw = localStorage.getItem('uf_artist_signup');
        if (raw) {
          const s = JSON.parse(raw) as {
            full_name?: string; phone?: string; country_code?: string;
          };
          if (s.full_name) setRealName(s.full_name);
          if (s.phone) setPhone(s.phone);
          if (s.country_code) setCountry(s.country_code);
        }
      } catch { /* ignore */ }
      setBootChecked(true);
    })();
  }, [user, isLoading, navigate]);

  // Reset doc type when country changes
  useEffect(() => {
    const options = docsForCountry(country);
    if (!options.includes(docType)) setDocType(options[0]);
  }, [country, docType]);

  // PAN cards & passports have all the info on the front — back is optional.
  // Everything else (Voter ID, Driver's Licence, National ID) needs both sides.
  const needsBack = docType !== 'pan' && docType !== 'passport';
  const allowedDocs = docsForCountry(country);

  const canNext = () => {
    if (step === 1) return stageName.trim().length >= 2 && realName.trim().length >= 2 && phone.trim().length >= 5;
    if (step === 2) return [instagram, youtube, spotify, appleMusic].some((s) => s.trim().length > 4);
    if (step === 3) return !!docFront && (!needsBack || !!docBack) && !!selfie;
    if (step === 4) return !!livenessShots;
    if (step === 5) return !!photo;
    return agreeTerms && agreePrivacy;
  };

  const submit = async () => {
    if (!user) return;
    if (!agreeTerms || !agreePrivacy) {
      toast.error('Please accept the Artist Terms and Privacy Policy.');
      return;
    }
    setSubmitting(true);
    try {
      const [frontPath, backPath, selfiePath, photoUrl] = await Promise.all([
        docFront ? uploadKycFile(user.id, 'front', docFront) : Promise.resolve(null),
        needsBack && docBack ? uploadKycFile(user.id, 'back', docBack) : Promise.resolve(null),
        selfie ? uploadKycFile(user.id, 'selfie', selfie) : Promise.resolve(null),
        photo ? uploadArtistPhoto(user.id, photo) : Promise.resolve(null),
      ]);

      const { error } = await supabase.from('artist_applications').insert({
        user_id: user.id,
        stage_name: stageName.trim(),
        real_name: realName.trim(),
        phone: phone.trim(),
        country_code: country,
        social_links: {
          instagram: instagram.trim() || null,
          youtube: youtube.trim() || null,
          spotify: spotify.trim() || null,
          apple_music: appleMusic.trim() || null,
          bio: bio.trim() || null,
        },
        id_doc_type: docType,
        id_doc_front_path: frontPath,
        id_doc_back_path: backPath,
        selfie_path: selfiePath,
        artist_photo_path: photoUrl,
      });
      if (error) throw error;
      toast.success('Application submitted ✓');
      navigate('/artist/status', { replace: true });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !bootChecked) {
    return <div className="min-h-[100dvh] bg-background" />;
  }

  return (
    <FadeTransition>
      <SEOHead
        title="Apply as Artist — Universflow"
        description="Become a verified Universflow artist. Submit ID, get reviewed in 1–3 days, then publish your music."
        path="/artist/apply"
      />
      <div className="min-h-[100dvh] bg-background text-foreground pb-32">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => (step === 1 ? navigate(-1) : setStep((s) => (s - 1) as Step))}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.04] active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[15px] font-semibold tracking-tight">Apply as Artist</h1>
            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">Step {step}/5</span>
          </div>
          <div className="h-0.5 bg-white/5">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
          </div>
        </header>

        <main className="max-w-md mx-auto px-5 pt-6 space-y-5">
          {step === 1 && (
            <section className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[12.5px] leading-relaxed text-foreground/90">
                  Verification takes <strong>1 to 3 days</strong>. Your ID is stored privately and
                  deleted automatically after review.
                </p>
              </div>
              <Field label="Stage / Artist name">
                <Input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="e.g. KAYO" maxLength={50} />
              </Field>
              <Field label="Legal full name">
                <Input value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="As shown on ID" maxLength={80} />
              </Field>
              <Field label="Phone number">
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" maxLength={20} />
              </Field>
              <Field label="Country">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {COUNTRIES.map(([c, l]) => (
                    <option key={c} value={c}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Short bio (optional)">
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} placeholder="What you make, where you're from…" rows={3} />
              </Field>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <p className="text-[12.5px] text-muted-foreground">
                Paste at least <strong>one</strong> artist profile link so we can match it to your ID.
              </p>
              <Field label="Instagram"><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/yourhandle" /></Field>
              <Field label="YouTube"><Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@yourchannel" /></Field>
              <Field label="Spotify artist"><Input value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="https://open.spotify.com/artist/…" /></Field>
              <Field label="Apple Music artist"><Input value={appleMusic} onChange={(e) => setAppleMusic(e.target.value)} placeholder="https://music.apple.com/…" /></Field>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <Field label="Document type">
                <div className="grid grid-cols-2 gap-2">
                  {allowedDocs.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDocType(d)}
                      className={`h-11 rounded-xl text-[12.5px] font-medium border transition ${
                        docType === d
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white/[0.03] border-white/10 text-muted-foreground'
                      }`}
                    >
                      {ID_DOC_LABELS[d]}
                    </button>
                  ))}
                </div>
              </Field>
              <FilePicker label="ID — front" file={docFront} onPick={setDocFront} />
              {needsBack && <FilePicker label="ID — back" file={docBack} onPick={setDocBack} />}
              <FilePicker label="Selfie holding the same ID" file={selfie} onPick={setSelfie} />
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                Files are compressed on-device, stored privately, and deleted right after review.
              </p>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <p className="text-[12.5px] text-muted-foreground">
                A clean, high-quality photo of you. This becomes your public profile picture once verified.
              </p>
              <FilePicker label="Artist photo" file={photo} onPick={setPhoto} />
            </section>
          )}

          {step === 5 && (
            <section className="space-y-4">
              <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
                <p className="text-[13px] font-semibold mb-2">Almost done</p>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  Review takes 1–3 days. You'll get a push notification with the result.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#FF2D55]"
                />
                <span className="text-[12.5px] leading-relaxed">
                  I have read and agree to the{' '}
                  <Link to="/legal/artist-terms" className="underline text-primary">Artist Terms</Link>{' '}
                  and confirm I have the right to publish the music I will upload.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#FF2D55]"
                />
                <span className="text-[12.5px] leading-relaxed">
                  I agree to the{' '}
                  <Link to="/legal/artist-privacy" className="underline text-primary">Artist Privacy Policy</Link>,
                  including that my ID will be deleted after review.
                </span>
              </label>
            </section>
          )}

          <div className="pt-2 flex gap-3">
            {step < 5 ? (
              <Button
                className="flex-1 h-12 rounded-xl text-[14px] font-semibold"
                disabled={!canNext()}
                onClick={() => setStep((s) => (s + 1) as Step)}
                style={{ background: '#FF2D55', color: '#fff' }}
              >
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                className="flex-1 h-12 rounded-xl text-[14px] font-semibold"
                disabled={!canNext() || submitting}
                onClick={submit}
                style={{ background: '#FF2D55', color: '#fff' }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Submit application</span>
                )}
              </Button>
            )}
          </div>
        </main>
      </div>
    </FadeTransition>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">{label}</span>
      {children}
    </label>
  );
}
