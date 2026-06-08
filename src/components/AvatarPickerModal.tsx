import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { PRESET_AVATARS } from '@/lib/avatars';
import PortraitAvatar from '@/components/PortraitAvatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHaptics } from '@/hooks/useHaptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatar: string | null;
  onSaved: (avatarId: string) => void;
}

const AvatarPickerModal = ({ isOpen, onClose, userId, currentAvatar, onSaved }: Props) => {
  const [selected, setSelected] = useState<string | null>(currentAvatar);
  const [saving, setSaving] = useState(false);
  const { trigger } = useHaptics();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: selected })
        .eq('user_id', userId);
      if (error) throw error;
      trigger('success');
      onSaved(selected);
      toast.success('Avatar updated');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-card border-t border-x border-white/10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-bold">Choose Avatar</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Pick a look that matches your vibe</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="grid grid-cols-3 gap-3">
            {PRESET_AVATARS.map((av) => {
              const isSel = selected === av.id;
              return (
                <button
                  key={av.id}
                  onClick={() => { setSelected(av.id); trigger('selection'); }}
                  className="relative aspect-square rounded-2xl overflow-hidden transition-all active:scale-95 flex flex-col"
                  style={{
                    boxShadow: isSel ? '0 0 0 3px hsl(var(--primary)), 0 8px 24px hsl(var(--primary) / 0.4)' : '0 0 0 1px hsl(var(--border))',
                  }}
                  aria-label={av.name}
                >
                  <div className="flex-1 w-full">
                    <PortraitAvatar variant={av.id} size={140} />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-[10px] font-semibold text-white text-center truncate">{av.name}</p>
                  </div>
                  {isSel && (
                    <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 pt-2 pb-6 safe-area-pb border-t border-white/[0.06] bg-card">
          <button
            onClick={handleSave}
            disabled={!selected || saving || selected === currentAvatar}
            className="w-full py-3.5 rounded-full text-sm font-bold uf-rose-gradient text-black disabled:opacity-40 active:scale-[0.98] transition"
          >
            {saving ? 'Saving…' : 'Set as Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarPickerModal;
