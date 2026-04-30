import { memo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePremium } from '@/hooks/usePremium';
import { iosBounce } from '@/lib/animations';

interface PremiumGateProps {
  children: ReactNode;
  feature?: string;
  showLockIcon?: boolean;
  fallback?: ReactNode;
}

/**
 * Wraps content that should only be accessible to premium users.
 * Shows a premium upsell modal when non-premium users try to access.
 */
export const PremiumGate = memo(function PremiumGate({ 
  children, 
  feature = 'this feature',
  showLockIcon = true,
  fallback,
}: PremiumGateProps) {
  const { isPremium, isLoading } = usePremium();

  if (isLoading) {
    return <div className="animate-pulse bg-muted/20 rounded-lg h-12" />;
  }

  if (isPremium) {
    return <>{children}</>;
  }

  // Show fallback or locked state for non-premium users
  return fallback ?? (
    <div className="relative">
      <div className="opacity-50 pointer-events-none blur-[2px]">
        {children}
      </div>
      {showLockIcon && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="p-3 rounded-full"
            style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          >
            <Lock className="w-6 h-6 text-primary" />
          </div>
        </div>
      )}
    </div>
  );
});

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

/**
 * Modal that appears when a non-premium user tries to access a premium feature.
 */
export const PremiumModal = memo(function PremiumModal({ 
  isOpen, 
  onClose,
  feature = 'this feature',
}: PremiumModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/premium');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={iosBounce}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(40, 40, 45, 1), rgba(20, 20, 25, 1))',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Close button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10"
            >
              <X className="w-5 h-5" />
            </motion.button>

            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))',
                }}
              >
                <Crown className="w-10 h-10 text-primary-foreground" />
              </motion.div>

              <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
              <p className="text-muted-foreground mb-6">
                Upgrade to Premium to unlock {feature} and enjoy all the benefits.
              </p>

              <div className="space-y-3 text-left mb-6">
                {[
                  'Ad-free listening',
                  'Offline downloads',
                  'High-quality audio',
                  'Exclusive content',
                ].map((benefit, i) => (
                  <motion.div 
                    key={benefit}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary text-xs">✓</span>
                    </div>
                    <span className="text-sm">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleUpgrade}
                className="w-full py-4 rounded-2xl font-semibold"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                }}
              >
                View Premium Options
              </motion.button>

              <button 
                onClick={onClose}
                className="w-full py-3 mt-2 text-sm text-muted-foreground"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default PremiumGate;
