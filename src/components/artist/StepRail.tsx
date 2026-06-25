import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

export type RailStep = {
  key: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
  /** 'done' | 'active' | 'todo' | 'failed' */
  state: 'done' | 'active' | 'todo' | 'failed';
  at?: string | null;
};

/**
 * Vertical editorial timeline used on /artist/status.
 * Mobile-first, rose-accented, with a subtle "live pulse" on the active step.
 */
export default function StepRail({ steps }: { steps: RailStep[] }) {
  return (
    <ol className="relative pl-7">
      {/* Spine */}
      <span
        aria-hidden
        className="absolute left-[10px] top-2 bottom-2 w-px"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,45,85,0.6) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.04) 100%)',
        }}
      />
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isActive = s.state === 'active';
        const isDone = s.state === 'done';
        const isFailed = s.state === 'failed';
        return (
          <motion.li
            key={s.key}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative pb-7 last:pb-0"
          >
            {/* Node */}
            <span
              className="absolute -left-7 top-0 grid place-items-center w-[22px] h-[22px] rounded-full"
              style={{
                background: isDone
                  ? 'linear-gradient(180deg, #FF3B5C 0%, #E11D48 100%)'
                  : isActive
                    ? 'rgba(255,45,85,0.18)'
                    : isFailed
                      ? 'rgba(244,63,94,0.18)'
                      : 'rgba(255,255,255,0.05)',
                border: isActive
                  ? '1px solid rgba(255,45,85,0.55)'
                  : isFailed
                    ? '1px solid rgba(244,63,94,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isDone ? '0 6px 16px rgba(255,45,85,0.35)' : 'none',
              }}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'rgba(255,45,85,0.35)' }}
                />
              )}
              {isDone ? (
                <Check className="relative w-3 h-3 text-white" strokeWidth={3} />
              ) : (
                <Icon
                  className="relative w-3 h-3"
                  style={{
                    color: isActive ? '#FF5A77' : isFailed ? '#FB7185' : 'rgba(255,255,255,0.45)',
                  }}
                />
              )}
            </span>

            <div className="flex items-baseline justify-between gap-3">
              <p
                className="text-[14px] font-semibold tracking-tight"
                style={{
                  color: isActive
                    ? '#fff'
                    : isDone
                      ? 'rgba(255,255,255,0.92)'
                      : isFailed
                        ? '#FB7185'
                        : 'rgba(255,255,255,0.5)',
                }}
              >
                {s.label}
              </p>
              {s.at && (
                <span className="text-[10.5px] tabular-nums text-muted-foreground/70 shrink-0">
                  {s.at}
                </span>
              )}
            </div>
            {s.sub && (
              <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground/85">{s.sub}</p>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
