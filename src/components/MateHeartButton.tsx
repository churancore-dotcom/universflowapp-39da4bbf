import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useJamQueue } from '@/contexts/JamQueueContext';
import { triggerHaptic } from '@/hooks/useHaptics';

/**
 * Floating shortcut back to the active Jam Queue room.
 * (File name kept for git/import stability; default export is JamHeartButton.)
 */
const JamHeartButton = memo(function JamHeartButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, members, queue } = useJamQueue();

  const hide =
    !isConnected ||
    location.pathname.startsWith('/jam') ||
    location.pathname.startsWith('/listen-together') ||
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/admin');

  return (
    <AnimatePresence>
      {!hide && (
        <motion.button
          key="jam-fab"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          onClick={() => {
            triggerHaptic('selection');
            navigate('/jam');
          }}
          className="fixed z-[55] right-3 bottom-[150px] flex items-center justify-center w-14 h-14 rounded-full active:scale-95 transition-transform"
          style={{
            background: 'radial-gradient(circle at 30% 30%, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 60%, hsl(var(--primary) / 0.6) 100%)',
            boxShadow: '0 10px 30px -8px hsl(var(--primary) / 0.55), 0 0 0 1px hsl(var(--primary) / 0.4) inset',
          }}
          aria-label="Open Jam Queue"
        >
          <ListMusic className="w-6 h-6 text-primary-foreground relative z-10" />

          {members.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-background text-[10px] font-bold text-primary flex items-center justify-center border border-primary/40">
              <Users className="w-2.5 h-2.5 mr-0.5" />
              {members.length}
            </span>
          )}

          {queue.length > 0 && (
            <span className="absolute -bottom-1 -left-1 min-w-[20px] h-5 px-1.5 rounded-full bg-background text-[10px] font-bold text-foreground flex items-center justify-center border border-white/20">
              {queue.length}
            </span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
});

export default JamHeartButton;
