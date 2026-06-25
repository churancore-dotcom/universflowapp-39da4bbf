import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  delay?: number;
} & Omit<HTMLMotionProps<'div'>, 'children'>;

/**
 * Premium dark-glass card used across artist surfaces.
 * Subtle rose glow when `glow`, hairline border, deep shadow.
 */
export default function BentoCard({ children, className = '', glow, delay = 0, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-[22px] overflow-hidden ${className}`}
      style={{
        background: 'rgba(16,16,18,0.78)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        boxShadow: glow
          ? '0 24px 70px rgba(255,45,85,0.18), 0 1px 0 rgba(255,255,255,0.04) inset'
          : '0 18px 50px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
      {...rest}
    >
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-60"
          style={{
            background:
              'radial-gradient(closest-side, rgba(255,45,85,0.35), transparent 70%)',
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
