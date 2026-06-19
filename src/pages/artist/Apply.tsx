import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Upload, Check, ShieldCheck, Globe2, User, Link2, FileCheck2, Camera, Image as ImageIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';
import { FadeTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FaceLivenessCapture, { LivenessShots } from '@/components/FaceLivenessCapture';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { detectCountrySilently } from '@/lib/geoCountry';
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

// Wide country list. Order: Top-of-mind first, then alphabetical.
const COUNTRIES: ReadonlyArray<readonly [string, string]> = [
  ['IN', '🇮🇳 India'],
  ['US', '🇺🇸 United States'],
  ['GB', '🇬🇧 United Kingdom'],
  ['CA', '🇨🇦 Canada'],
  ['AU', '🇦🇺 Australia'],
  ['AE', '🇦🇪 United Arab Emirates'],
  ['DE', '🇩🇪 Germany'],
  ['FR', '🇫🇷 France'],
  ['IT', '🇮🇹 Italy'],
  ['ES', '🇪🇸 Spain'],
  ['NL', '🇳🇱 Netherlands'],
  ['BE', '🇧🇪 Belgium'],
  ['PT', '🇵🇹 Portugal'],
  ['PL', '🇵🇱 Poland'],
  ['SE', '🇸🇪 Sweden'],
  ['NO', '🇳🇴 Norway'],
  ['DK', '🇩🇰 Denmark'],
  ['FI', '🇫🇮 Finland'],
  ['IE', '🇮🇪 Ireland'],
  ['CH', '🇨🇭 Switzerland'],
  ['AT', '🇦🇹 Austria'],
  ['CZ', '🇨🇿 Czechia'],
  ['HU', '🇭🇺 Hungary'],
  ['RO', '🇷🇴 Romania'],
  ['GR', '🇬🇷 Greece'],
  ['TR', '🇹🇷 Türkiye'],
  ['RU', '🇷🇺 Russia'],
  ['UA', '🇺🇦 Ukraine'],
  ['JP', '🇯🇵 Japan'],
  ['KR', '🇰🇷 South Korea'],
  ['CN', '🇨🇳 China'],
  ['HK', '🇭🇰 Hong Kong'],
  ['SG', '🇸🇬 Singapore'],
  ['MY', '🇲🇾 Malaysia'],
  ['ID', '🇮🇩 Indonesia'],
  ['TH', '🇹🇭 Thailand'],
  ['VN', '🇻🇳 Vietnam'],
  ['PH', '🇵🇭 Philippines'],
  ['PK', '🇵🇰 Pakistan'],
  ['BD', '🇧🇩 Bangladesh'],
  ['LK', '🇱🇰 Sri Lanka'],
  ['NP', '🇳🇵 Nepal'],
  ['NZ', '🇳🇿 New Zealand'],
  ['BR', '🇧🇷 Brazil'],
  ['MX', '🇲🇽 Mexico'],
  ['AR', '🇦🇷 Argentina'],
  ['CL', '🇨🇱 Chile'],
  ['CO', '🇨🇴 Colombia'],
  ['PE', '🇵🇪 Peru'],
  ['ZA', '🇿🇦 South Africa'],
  ['NG', '🇳🇬 Nigeria'],
  ['EG', '🇪🇬 Egypt'],
  ['KE', '🇰🇪 Kenya'],
  ['MA', '🇲🇦 Morocco'],
  ['SA', '🇸🇦 Saudi Arabia'],
  ['IL', '🇮🇱 Israel'],
  ['QA', '🇶🇦 Qatar'],
  ['XX', '🌍 Other / Not listed'],
];

const STEP_META: Record<Step, { label: string; icon: typeof User }> = {
  1: { label: 'About you',     icon: User },
  2: { label: 'Your music',    icon: Link2 },
  3: { label: 'Verify ID',     icon: FileCheck2 },
  4: { label: 'Face check',    icon: Camera },
  5: { label: 'Profile photo', icon: ImageIcon },
  6: { label: 'Submit',        icon: Sparkles },
};

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
      <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] p-4 flex items-center gap-3 active:bg-white/[0.06] transition cursor-pointer">
        {file ? (
          <>
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center shrink-0">
              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              className="text-[12px] text-primary px-2 py-1 font-medium"
              onClick={(e) => { e.preventDefault(); onPick(null); }}
            >
              Change
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium">Tap to upload</p>
              <p className="text-[11px] text-muted-foreground">JPG, PNG or WebP · auto-compressed</p>
            </div>
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
  const [country, setCountry] = useState(''); // NO default. User must pick.
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [spotify, setSpotify] = useState('');
  const [appleMusic, setAppleMusic] = useState('');

  const [docType, setDocType] = useState<IdDocType | null>(null);
  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [livenessShots, setLivenessShots] = useState<LivenessShots | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }
    (async () => {
      const existing = await getMyApplication(user.id);
      if (existing) { navigate('/artist/status', { replace: true }); return; }

      let prefilledCountry = '';
      try {
        const raw = localStorage.getItem('uf_artist_signup');
        if (raw) {
          const s = JSON.parse(raw) as { full_name?: string; phone?: string; country_code?: string };
          if (s.full_name) setRealName(s.full_name);
          if (s.phone) setPhone(s.phone);
          if (s.country_code) { setCountry(s.country_code); prefilledCountry = s.country_code; }
        }
      } catch { /* ignore */ }

      // Silent geo-detect ONLY as a soft suggestion if user hasn't set one.
      if (!prefilledCountry) {
        try {
          const cc = await detectCountrySilently();
          if (cc && COUNTRIES.some(([c]) => c === cc)) setCountry(cc);
        } catch { /* keep blank */ }
      }

      setBootChecked(true);
    })();
  }, [user, isLoading, navigate]);

  // Update doc type when country changes — but never auto-pick if user hasn't chosen country yet.
  useEffect(() => {
    if (!country) { setDocType(null); return; }
    const options = docsForCountry(country);
    if (!docType || !options.includes(docType)) setDocType(options[0]);
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsBack = docType !== 'pan' && docType !== 'passport';
  const allowedDocs = country ? docsForCountry(country) : [];

  const canNext = () => {
    if (step === 1) return stageName.trim().length >= 2 && realName.trim().length >= 2 && phone.trim().length >= 5 && !!country;
    if (step === 2) return [instagram, youtube, spotify, appleMusic].some((s) => s.trim().length > 4);
    if (step === 3) return !!docType && !!docFront && (!needsBack || !!docBack) && !!selfie;
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
      const blobToFile = (b: Blob, name: string) => new File([b], name, { type: b.type || 'image/jpeg' });
      const faceUploads = livenessShots
        ? await Promise.all(
            (['center', 'left', 'right', 'up'] as const).map((k) =>
              uploadKycFile(user.id, 'selfie', blobToFile(livenessShots[k], `face-${k}.jpg`)),
            ),
          )
        : [];

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
          face_shots: faceUploads,
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

  if (isLoading || !bootChecked) return <div className="min-h-[100dvh] bg-background" />;

  const meta = STEP_META[step];
  const StepIcon = meta.icon;

  return (
    <FadeTransition>
      <SEOHead
        title="Apply as Artist — Universflow"
        description="Become a verified Universflow artist. Submit ID, get reviewed in 1–3 days, then publish your music."
        path="/artist/apply"
      />
      <div className="min-h-[100dvh] bg-background text-foreground pb-36">
        {/* Header with title + dot progress */}
        <header
          className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-white/5"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => {
                if (step > 1) { setStep((s) => (s - 1) as Step); return; }
                // Step 1 back: leave the apply flow entirely.
                // History may be empty (deep-link after signup) — fall back to home.
                if (window.history.length > 1) navigate(-1);
                else navigate('/', { replace: true });
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.06] active:scale-95 transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight leading-tight truncate">Apply as Artist</h1>
              <p className="text-[11px] text-muted-foreground leading-tight truncate">{meta.label}</p>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                const n = i + 1;
                const active = n === step;
                const done = n < step;
                return (
                  <span
                    key={n}
                    className={`h-1.5 rounded-full transition-all ${
                      active ? 'w-5 bg-primary' : done ? 'w-1.5 bg-primary/60' : 'w-1.5 bg-white/15'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </header>

        <main className="max-w-md mx-auto px-5 pt-5 pb-2">
          {/* Step header pill */}
          <div className="mb-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/12 border border-primary/20 flex items-center justify-center">
              <StepIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Step {step} of {TOTAL_STEPS}</p>
              <h2 className="text-[18px] font-semibold leading-tight">{meta.label}</h2>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.section
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {step === 1 && (
                <>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/8 border border-primary/15">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[12.5px] leading-relaxed text-foreground/90">
                      Verification takes <strong>1–3 days</strong>. Your ID is encrypted, kept private,
                      and <strong>auto-deleted after review</strong>.
                    </p>
                  </div>
                  <Field label="Stage / Artist name">
                    <Input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="e.g. KAYO" maxLength={50} />
                  </Field>
                  <Field label="Legal full name">
                    <Input value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="As shown on ID" maxLength={80} />
                  </Field>
                  <Field label="Phone number">
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="With country code" maxLength={20} />
                  </Field>
                  <Field label="Country">
                    <div className="relative">
                      <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className={`flex h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 py-2 text-sm appearance-none focus:outline-none focus:border-primary/50 ${
                          !country ? 'text-muted-foreground' : ''
                        }`}
                      >
                        <option value="" disabled>Select your country…</option>
                        {COUNTRIES.map(([c, l]) => (
                          <option key={c} value={c} className="bg-background text-foreground">{l}</option>
                        ))}
                      </select>
                    </div>
                    {!country && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        We use this to ask for the right ID document.
                      </p>
                    )}
                  </Field>
                  <Field label="Short bio (optional)">
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} placeholder="What you make, where you're from…" rows={3} />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="text-[12.5px] text-muted-foreground -mt-1">
                    Paste at least <strong>one</strong> artist profile link so we can match it to your ID.
                  </p>
                  <Field label="Instagram"><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/yourhandle" /></Field>
                  <Field label="YouTube"><Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@yourchannel" /></Field>
                  <Field label="Spotify artist"><Input value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="https://open.spotify.com/artist/…" /></Field>
                  <Field label="Apple Music artist"><Input value={appleMusic} onChange={(e) => setAppleMusic(e.target.value)} placeholder="https://music.apple.com/…" /></Field>
                </>
              )}

              {step === 3 && (
                <>
                  {!country ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-[12.5px] text-amber-200">
                      Pick your country in Step 1 first so we can show the right ID options.
                    </div>
                  ) : (
                    <>
                      <Field label="Document type">
                        <div className="space-y-2">
                          {allowedDocs.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDocType(d)}
                              className={`w-full h-12 px-4 rounded-xl text-[13.5px] font-medium border transition flex items-center justify-between ${
                                docType === d
                                  ? 'bg-primary/15 text-foreground border-primary'
                                  : 'bg-white/[0.03] border-white/10 text-muted-foreground'
                              }`}
                            >
                              <span>{ID_DOC_LABELS[d]}</span>
                              {docType === d && <Check className="w-4 h-4 text-primary" />}
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
                    </>
                  )}
                </>
              )}

              {step === 4 && (
                <>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/8 border border-primary/15">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[12.5px] leading-relaxed text-foreground/90">
                      Quick face check. Look at the camera and follow the prompts —{' '}
                      <strong>turn left, right, then up</strong>. We capture 4 photos to confirm you're a real person.
                    </p>
                  </div>
                  {livenessShots ? (
                    <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
                      <Check className="w-5 h-5 text-emerald-300" />
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-emerald-200">Face check complete</p>
                        <p className="text-[11.5px] text-emerald-200/80">4 photos captured. Tap Continue.</p>
                      </div>
                      <button type="button" onClick={() => setLivenessShots(null)} className="text-[11.5px] text-emerald-200 underline">Redo</button>
                    </div>
                  ) : (
                    <FaceLivenessCapture onComplete={(s) => setLivenessShots(s)} />
                  )}
                </>
              )}

              {step === 5 && (
                <>
                  <p className="text-[12.5px] text-muted-foreground -mt-1">
                    A clean, high-quality photo of you. This becomes your public profile picture once verified.
                  </p>
                  <FilePicker label="Artist photo" file={photo} onPick={setPhoto} />
                </>
              )}

              {step === 6 && (
                <>
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-[13px] font-semibold">Almost done</p>
                    </div>
                    <p className="text-[12.5px] text-foreground/80 leading-relaxed">
                      Review takes 1–3 days. You'll get a push notification with the result.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <input
                      type="checkbox" checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#FF2D55]"
                    />
                    <span className="text-[12.5px] leading-relaxed">
                      I agree to the{' '}
                      <Link to="/legal/artist-terms" className="underline text-primary">Artist Terms</Link>{' '}
                      and confirm I have the right to publish the music I will upload.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <input
                      type="checkbox" checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#FF2D55]"
                    />
                    <span className="text-[12.5px] leading-relaxed">
                      I agree to the{' '}
                      <Link to="/legal/artist-privacy" className="underline text-primary">Artist Privacy Policy</Link>,
                      including that my ID will be deleted after review.
                    </span>
                  </label>
                </>
              )}
            </motion.section>
          </AnimatePresence>
        </main>

        {/* Sticky bottom CTA */}
        <div
          className="fixed bottom-0 inset-x-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 px-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        >
          <div className="max-w-md mx-auto">
            {step < TOTAL_STEPS ? (
              <Button
                className="w-full h-13 rounded-2xl text-[14.5px] font-semibold shadow-lg shadow-primary/20"
                disabled={!canNext()}
                onClick={() => setStep((s) => (s + 1) as Step)}
                style={{ background: '#FF2D55', color: '#fff', height: 52 }}
              >
                Continue <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                className="w-full rounded-2xl text-[14.5px] font-semibold shadow-lg shadow-primary/20"
                disabled={!canNext() || submitting}
                onClick={submit}
                style={{ background: '#FF2D55', color: '#fff', height: 52 }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Submit application</span>
                )}
              </Button>
            )}
          </div>
        </div>
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
