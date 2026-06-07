import React from 'react';
import { motion } from 'framer-motion';

interface RoseHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  coverUrl?: string | null;
  /** Optional right-side action button (e.g. a play button) */
  action?: {
    label?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    ariaLabel?: string;
  };
  /** Extra content rendered below the title, before action row */
  children?: React.ReactNode;
  /** Compact removes inner vertical padding for tighter headers */
  compact?: boolean;
  className?: string;
}

/**
 * Rose-ember hero card — shared across Home, Library, Profile, Search,
 * Playlist detail. Matches the bento home hero: gradient background,
 * blurred cover photo as backdrop on the right, crisp artwork thumbnail,
 * Bebas Neue display title.
 */
const RoseHero: React.FC<RoseHeroProps> = ({
  eyebrow,
  title,
  subtitle,
  coverUrl,
  action,
  children,
  compact = false,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-3xl overflow-hidden block ${compact ? 'p-4' : 'p-5'} ${className}`}
      style={{
        background: 'linear-gradient(135deg, #FF2D55 0%, #FFB199 100%)',
        boxShadow: '0 12px 40px -10px rgba(255,45,85,0.45)',
        fontFamily: 'Barlow, Inter, system-ui, sans-serif',
      }}
    >
      {coverUrl && (
        <>
          <img
            src={coverUrl}
            alt=""
            aria-hidden
            className="absolute inset-y-0 right-0 h-full w-2/3 object-cover pointer-events-none"
            style={{
              filter: 'blur(18px) saturate(140%)',
              opacity: 0.55,
              WebkitMaskImage: 'linear-gradient(to left, #000 30%, transparent 100%)',
              maskImage: 'linear-gradient(to left, #000 30%, transparent 100%)',
            }}
          />
          <img
            src={coverUrl}
            alt=""
            aria-hidden
            className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 rounded-2xl object-cover pointer-events-none"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
            referrerPolicy="no-referrer"
          />
        </>
      )}

      <div className={`relative z-10 ${coverUrl ? 'pr-28' : ''}`}>
        {eyebrow && (
          <p className="text-black/60 text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1">
            {eyebrow}
          </p>
        )}
        <h1
          className="text-black text-[30px] leading-[0.95] truncate"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.01em' }}
        >
          {title}
        </h1>
        {subtitle && (
          <div className="text-black/75 text-xs font-semibold mt-1.5 truncate">{subtitle}</div>
        )}
        {children}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            aria-label={action.ariaLabel || action.label}
            className="mt-4 inline-flex items-center gap-2 bg-black text-white rounded-full pl-3 pr-4 py-2 text-xs font-bold active:scale-95 transition-transform shadow-lg"
          >
            {action.icon}
            {action.label && <span>{action.label}</span>}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default RoseHero;
