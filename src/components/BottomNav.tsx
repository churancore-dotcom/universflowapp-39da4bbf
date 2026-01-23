import { motion } from 'framer-motion';
import { Home, Search, Library, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { iosBounce } from '@/lib/animations';

const navItems = [
  { icon: Home, label: 'Listen Now', path: '/home' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Library, label: 'Library', path: '/library' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSong } = usePlayer();

  return (
    <motion.nav
      className="fixed left-0 right-0 bottom-0 z-50 safe-area-pb"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.2 }}
      style={{ 
        background: 'rgba(18, 18, 20, 0.94)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        borderTop: '0.5px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.path}
              className="flex flex-col items-center gap-1 py-1.5 px-5 min-w-[64px]"
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.88 }}
              transition={iosBounce}
            >
              <Icon
                className={`w-[22px] h-[22px] transition-colors duration-150 ${
                  isActive ? 'text-rose-500' : 'text-white/40'
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
                fill={isActive ? 'currentColor' : 'none'}
              />
              
              <span
                className={`text-[10px] font-medium transition-colors duration-150 ${
                  isActive ? 'text-rose-500' : 'text-white/40'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomNav;
