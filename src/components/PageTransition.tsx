import { motion, Transition } from 'framer-motion';
import { ReactNode, forwardRef, createContext, useContext, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageSpring: Transition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 38,
  mass: 0.6,
};

const pageTiming: Transition = {
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94],
};

// Tab order for directional transitions
const TAB_ORDER = ['/home', '/search', '/library', '/profile'];

// Context to share navigation direction
const NavDirectionContext = createContext<number>(0);

export const useNavDirection = () => useContext(NavDirectionContext);

export const NavDirectionProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const prevIndexRef = useRef(TAB_ORDER.indexOf(location.pathname));

  const direction = useMemo(() => {
    const currentIndex = TAB_ORDER.indexOf(location.pathname);
    if (currentIndex === -1) return 0;
    const prev = prevIndexRef.current;
    prevIndexRef.current = currentIndex;
    if (prev === -1) return 0;
    return currentIndex > prev ? 1 : currentIndex < prev ? -1 : 0;
  }, [location.pathname]);

  return (
    <NavDirectionContext.Provider value={direction}>
      {children}
    </NavDirectionContext.Provider>
  );
};

const PageTransition = ({ children, className = '' }: PageTransitionProps) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: 60, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.98 }}
      transition={pageSpring}
    >
      {children}
    </motion.div>
  );
};

export const SheetTransition = ({ children, className = '' }: PageTransitionProps) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: "8%", scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: "5%", scale: 0.98 }}
      transition={pageSpring}
    >
      {children}
    </motion.div>
  );
};

export const FadeTransition = forwardRef<HTMLDivElement, PageTransitionProps>(({ children, className = '' }, ref) => {
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={pageTiming}
    >
      {children}
    </motion.div>
  );
});
FadeTransition.displayName = 'FadeTransition';

// Premium iOS-style directional tab transition
export const TabTransition = ({ children, className = '' }: PageTransitionProps) => {
  const direction = useNavDirection();
  const slideDistance = 80;

  return (
    <motion.div
      className={className}
      initial={{ 
        opacity: 0, 
        x: direction * slideDistance,
        scale: 0.92,
        filter: 'blur(8px)',
      }}
      animate={{ 
        opacity: 1, 
        x: 0,
        scale: 1,
        filter: 'blur(0px)',
      }}
      exit={{ 
        opacity: 0, 
        x: direction * -slideDistance * 0.5,
        scale: 0.95,
        filter: 'blur(6px)',
      }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 34,
        mass: 0.5,
        filter: { duration: 0.25, ease: "easeOut" },
        opacity: { duration: 0.22, ease: "easeOut" },
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
