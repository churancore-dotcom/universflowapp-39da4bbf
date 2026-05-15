import { ReactNode } from 'react';
import ThemeAura from './ThemeAura';

interface MobileShellProps {
  children: ReactNode;
}

/**
 * MobileShell - Full-screen mobile app container
 * No responsive desktop scaling - pure mobile rendering
 */
const MobileShell = ({ children }: MobileShellProps) => {
  return (
    <div
      data-mobile-shell
      className="fixed inset-0 w-full h-full bg-background overflow-y-auto overflow-x-hidden"
      style={{
        touchAction: 'manipulation',
        minHeight: '100dvh',
        maxHeight: '100dvh',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <ThemeAura />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default MobileShell;
