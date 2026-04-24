import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Upload, Music, Image, Send, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MAX_AUDIO_SIZE = 50 * 1024 * 1024;
const MAX_COVER_SIZE = 5 * 1024 * 1024;
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];

const genres = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical', 'Country', 'Latin', 'Metal', 'Indie', 'Folk', 'Bollywood', 'Punjabi', 'Phonk', 'Lo-fi'];
const moods = ['Happy', 'Sad', 'Energetic', 'Chill', 'Romantic', 'Dark', 'Upbeat', 'Melancholic', 'Aggressive', 'Peaceful'];

const SongRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<'submit' | 'my-requests'>('submit');
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to submit a song request');
      navigate('/auth');
    }
  }, [user, navigate]);

  const fetchMyRequests = useCallback(async () => {
    if (!user) return;
    setLoadingRequests(true);
    const { data } = await supabase
      .from('song_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoadingRequests(false);
  }, [user]);

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_AUDIO.includes(file.type)) {
      toast.error('Please select a valid audio file (MP3, WAV, OGG, M4A)');
      return;
    }
    if (file.size > MAX_AUDIO_SIZE) {
      toast.error('Audio file must be under 50MB');
      return;
    }
    setAudioFile(file);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE.includes(file.type)) {
      toast.error('Please select a valid image (JPG, PNG, WebP)');
      return;
    }
    if (file.size > MAX_COVER_SIZE) {
      toast.error('Cover image must be under 5MB');
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Please sign in first'); navigate('/auth'); return; }
    if (!title.trim() || !artist.trim() || !audioFile) {
      toast.error('Title, artist and audio file are required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload audio
      const audioExt = audioFile.name.split('.').pop();
      const audioPath = `requests/${user.id}/${Date.now()}.${audioExt}`;
      const { error: audioErr } = await supabase.storage.from('music').upload(audioPath, audioFile);
      if (audioErr) throw audioErr;
      const { data: audioUrl } = supabase.storage.from('music').getPublicUrl(audioPath);

      // Upload cover if provided
      let coverUrl = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverPath = `requests/${user.id}/${Date.now()}-cover.${coverExt}`;
        const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, coverFile);
        if (!coverErr) {
          const { data: cUrl } = supabase.storage.from('covers').getPublicUrl(coverPath);
          coverUrl = cUrl.publicUrl;
        }
      }

      const { error } = await supabase.from('song_requests').insert({
        user_id: user.id,
        title: title.trim(),
        artist: artist.trim(),
        audio_url: audioUrl.publicUrl,
        cover_url: coverUrl,
        genre: genre || null,
        mood: mood || null,
      });

      if (error) throw error;

      toast.success('Song request submitted! Admin will review it soon.');
      setTitle(''); setArtist(''); setGenre(''); setMood('');
      setAudioFile(null); setCoverFile(null); setCoverPreview('');
    } catch (err: any) {
      console.error('Song request error:', err);
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  return (
    <PageTransition>
      <div className="h-[100dvh] bg-black flex flex-col overflow-hidden">
        <header
          className="flex-shrink-0 z-30 px-2 pt-3 pb-2 flex items-center safe-area-pt"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(40px)' }}
        >
          <button onClick={() => navigate(-1)} className="flex items-center gap-0.5 px-2 py-2 -ml-1 text-primary">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-sm font-semibold absolute left-1/2 -translate-x-1/2">Request a Song</h1>
        </header>

        {/* Tabs */}
        <div className="flex-shrink-0 px-4 pt-2">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(28,28,30,0.8)' }}>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'submit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={() => setTab('submit')}
            >
              Submit Request
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'my-requests' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={() => { setTab('my-requests'); fetchMyRequests(); }}
            >
              My Requests
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {tab === 'submit' ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Audio Upload */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(28,28,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Music className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Audio File *</span>
                </div>
                <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 cursor-pointer transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {audioFile ? audioFile.name : 'Tap to select audio file'}
                  </span>
                  <span className="text-xs text-muted-foreground/60">MP3, WAV, OGG, M4A • Max 50MB</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
                </label>
              </div>

              {/* Cover Upload */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(28,28,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Image className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Cover Art (Optional)</span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 cursor-pointer transition-colors overflow-hidden flex items-center justify-center flex-shrink-0">
                    {coverPreview ? (
                      <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                  </label>
                  <span className="text-xs text-muted-foreground">JPG, PNG, WebP • Max 5MB</span>
                </div>
              </div>

              {/* Song Details */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(28,28,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-sm font-semibold">Song Details</span>
                <Input placeholder="Song Title *" value={title} onChange={e => setTitle(e.target.value)} className="bg-white/5 border-white/10" />
                <Input placeholder="Artist Name *" value={artist} onChange={e => setArtist(e.target.value)} className="bg-white/5 border-white/10" />

                <div>
                  <span className="text-xs text-muted-foreground mb-1.5 block">Genre</span>
                  <div className="flex flex-wrap gap-1.5">
                    {genres.map(g => (
                      <button
                        key={g}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${genre === g ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
                        onClick={() => setGenre(genre === g ? '' : g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground mb-1.5 block">Mood</span>
                  <div className="flex flex-wrap gap-1.5">
                    {moods.map(m => (
                      <button
                        key={m}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${mood === m ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
                        onClick={() => setMood(mood === m ? '' : m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                className="w-full h-12 rounded-xl text-base font-semibold gap-2"
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim() || !artist.trim() || !audioFile}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {loadingRequests ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Music className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No requests yet</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Submit a song request to see it here</p>
                </div>
              ) : (
                requests.map(req => (
                  <div
                    key={req.id}
                    className="rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: 'rgba(28,28,30,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {req.cover_url ? (
                      <img src={req.cover_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Music className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{req.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{req.artist}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                      {getStatusIcon(req.status)}
                      {req.status}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default SongRequest;
