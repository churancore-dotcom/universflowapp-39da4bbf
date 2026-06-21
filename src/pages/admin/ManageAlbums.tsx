import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Disc, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  MoreVertical,
  Calendar,
  Music,
  Upload,
  X,
  Check,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';
import { getDatabaseError } from '@/lib/errorMessages';
import { useFilePreview } from '@/lib/useFilePreview';

interface Album {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  release_year: number | null;
  created_at: string;
  song_count?: number;
}

const ManageAlbums = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    release_year: new Date().getFullYear(),
    cover_url: '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('*')
        .order('created_at', { ascending: false });

      if (albumsError) throw albumsError;

      // Count songs per album
      const { data: songs } = await supabase.from('songs').select('album');

      const countMap: Record<string, number> = {};
      (songs || []).forEach(song => {
        if (song.album) {
          countMap[song.album] = (countMap[song.album] || 0) + 1;
        }
      });

      const albumsWithCounts = (albumsData || []).map(album => ({
        ...album,
        song_count: countMap[album.title] || 0,
      }));

      setAlbums(albumsWithCounts);
    } catch (error) {
      console.error('Error fetching albums:', error);
      toast.error('Failed to load albums');
    } finally {
      setLoading(false);
    }
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setCoverFile(compressed);
      setCoverPreview(URL.createObjectURL(compressed));
    } catch {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const uploadCover = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `albums/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('covers').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const resetForm = () => {
    setFormData({ title: '', artist: '', release_year: new Date().getFullYear(), cover_url: '' });
    setCoverFile(null);
    setCoverPreview(null);
    setEditingAlbum(null);
  };

  const openEditDialog = (album: Album) => {
    setEditingAlbum(album);
    setFormData({
      title: album.title,
      artist: album.artist,
      release_year: album.release_year || new Date().getFullYear(),
      cover_url: album.cover_url || '',
    });
    setCoverPreview(album.cover_url);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.artist.trim()) {
      toast.error('Title and artist are required');
      return;
    }

    setIsSaving(true);
    try {
      let coverUrl = formData.cover_url;

      if (coverFile) {
        coverUrl = await uploadCover(coverFile);
      }

      const albumData = {
        title: formData.title.trim(),
        artist: formData.artist.trim(),
        release_year: formData.release_year || null,
        cover_url: coverUrl || null,
      };

      if (editingAlbum) {
        const { error } = await supabase
          .from('albums')
          .update(albumData)
          .eq('id', editingAlbum.id);

        if (error) throw error;
        toast.success('Album updated!');
      } else {
        const { error } = await supabase
          .from('albums')
          .insert(albumData);

        if (error) throw error;
        toast.success('Album created!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAlbums();
    } catch (error) {
      toast.error(getDatabaseError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (album: Album) => {
    if (!confirm(`Delete "${album.title}"? This will not delete the songs.`)) return;

    try {
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', album.id);

      if (error) throw error;
      toast.success('Album deleted');
      fetchAlbums();
    } catch (error) {
      toast.error(getDatabaseError(error));
    }
  };

  const filteredAlbums = albums.filter(album =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Manage Albums</h1>
          <p className="text-muted-foreground mt-1">Create and organize albums</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 btn-premium w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Add Album
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10">
            <DialogHeader>
              <DialogTitle>{editingAlbum ? 'Edit Album' : 'Add New Album'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Cover Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-muted border-2 border-dashed border-border">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => { handleCoverSelect(e); e.target.value = ''; }}
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span className="gap-2">
                        <Upload className="w-4 h-4" />
                        {coverPreview ? 'Change' : 'Upload'} Cover
                      </span>
                    </Button>
                  </label>
                  {coverPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                        setFormData(prev => ({ ...prev, cover_url: '' }));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Album Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter album title"
                  className="bg-muted/50 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist">Artist *</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="Enter artist name"
                  className="bg-muted/50 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Release Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.release_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, release_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  className="bg-muted/50 border-white/10"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="btn-premium">
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="w-4 h-4 mr-2" /> {editingAlbum ? 'Update' : 'Create'}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="glass rounded-xl p-4 mb-6 flex items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Disc className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{albums.length}</p>
          <p className="text-xs text-muted-foreground">Total Albums</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search albums..."
            className="pl-10 bg-muted/50 border-white/10"
          />
        </div>
      </motion.div>

      {/* Albums Grid */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground">
            <Disc className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{searchQuery ? 'No albums match your search' : 'No albums yet'}</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredAlbums.map((album, index) => (
              <motion.div
                key={album.id}
                className="group relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 relative">
                  {album.cover_url ? (
                    <img 
                      src={album.cover_url} 
                      alt={album.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 bg-white/10 hover:bg-white/20"
                      onClick={() => openEditDialog(album)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 bg-white/10 hover:bg-destructive/50"
                      onClick={() => handleDelete(album)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-2">
                  <p className="font-medium truncate text-sm">{album.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {album.release_year && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        {album.release_year}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Music className="w-3 h-3" />
                      {album.song_count}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
};

export default ManageAlbums;
