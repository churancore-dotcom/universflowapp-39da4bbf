import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Edit2, Trash2, Eye, EyeOff, Search, MoreVertical, Play, X, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  cover_url: string | null;
  audio_url: string;
  is_visible: boolean;
  play_count: number;
  created_at: string;
}

const ManageSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', album: '', genre: '' });

  useEffect(() => {
    fetchSongs();

    const channel = supabase
      .channel('admin-songs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, fetchSongs)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchSongs = async () => {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSongs(data);
    }
    setLoading(false);
  };

  const toggleVisibility = async (song: Song) => {
    const { error } = await supabase
      .from('songs')
      .update({ is_visible: !song.is_visible })
      .eq('id', song.id);

    if (error) {
      toast.error('Failed to update visibility');
    } else {
      toast.success(song.is_visible ? 'Song hidden' : 'Song visible');
    }
  };

  const deleteSong = async (song: Song) => {
    if (!confirm(`Delete "${song.title}"? This cannot be undone.`)) return;

    const { error } = await supabase.from('songs').delete().eq('id', song.id);

    if (error) {
      toast.error('Failed to delete song');
    } else {
      toast.success('Song deleted');
    }
  };

  const openEditDialog = (song: Song) => {
    setEditingSong(song);
    setEditForm({
      title: song.title,
      artist: song.artist,
      album: song.album || '',
      genre: song.genre || '',
    });
  };

  const saveEdit = async () => {
    if (!editingSong) return;

    const { error } = await supabase
      .from('songs')
      .update({
        title: editForm.title,
        artist: editForm.artist,
        album: editForm.album || null,
        genre: editForm.genre || null,
      })
      .eq('id', editingSong.id);

    if (error) {
      toast.error('Failed to update song');
    } else {
      toast.success('Song updated');
      setEditingSong(null);
    }
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-display font-bold">Manage Songs</h1>
        <p className="text-muted-foreground mt-1">Edit, hide, or delete songs from your library</p>
      </motion.div>

      {/* Search */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs..."
            className="pl-10 bg-muted/50 border-white/10"
          />
        </div>
      </motion.div>

      {/* Songs Table */}
      <motion.div
        className="glass rounded-2xl overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{searchQuery ? 'No songs match your search' : 'No songs uploaded yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Song</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Album</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Genre</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Plays</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredSongs.map((song, index) => (
                    <motion.tr
                      key={song.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {song.cover_url ? (
                              <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{song.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell">{song.album || '-'}</td>
                      <td className="p-4 text-muted-foreground hidden lg:table-cell">{song.genre || '-'}</td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{song.play_count.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          song.is_visible
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {song.is_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {song.is_visible ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-white/10">
                            <DropdownMenuItem onClick={() => window.open(song.audio_url, '_blank')}>
                              <Play className="w-4 h-4 mr-2" /> Play
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(song)}>
                              <Edit2 className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleVisibility(song)}>
                              {song.is_visible ? (
                                <><EyeOff className="w-4 h-4 mr-2" /> Hide</>
                              ) : (
                                <><Eye className="w-4 h-4 mr-2" /> Show</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteSong(song)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSong} onOpenChange={() => setEditingSong(null)}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle>Edit Song</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1.5 bg-muted/50 border-white/10"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Artist</label>
              <Input
                value={editForm.artist}
                onChange={(e) => setEditForm(prev => ({ ...prev, artist: e.target.value }))}
                className="mt-1.5 bg-muted/50 border-white/10"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Album</label>
              <Input
                value={editForm.album}
                onChange={(e) => setEditForm(prev => ({ ...prev, album: e.target.value }))}
                className="mt-1.5 bg-muted/50 border-white/10"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Genre</label>
              <Input
                value={editForm.genre}
                onChange={(e) => setEditForm(prev => ({ ...prev, genre: e.target.value }))}
                className="mt-1.5 bg-muted/50 border-white/10"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditingSong(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={saveEdit} className="flex-1 btn-premium">
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageSongs;
