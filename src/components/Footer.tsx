import { motion } from 'framer-motion';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-6 px-4 text-center border-t border-white/5">
      {/* App branding */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #1a1a2e 0%, #0f0f1a 50%, #000000 100%)',
            boxShadow: '0 0 10px 2px rgba(100,150,255,0.2)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="footerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#a0c4ff" />
              </linearGradient>
            </defs>
            <path
              d="M18 18 L18 38 C18 48 26 54 32 54 C38 54 46 48 46 38 L46 18"
              stroke="url(#footerGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
        <span className="text-sm font-bold">
          <span className="gradient-text">Univers</span>
          <span className="text-white/90">Flow</span>
        </span>
      </div>
      
      <p className="text-[10px] text-muted-foreground/60">
        © {currentYear} UniversFlow. All rights reserved.
      </p>
      
      {/* Developer credit */}
      <motion.div 
        className="mt-3 py-2 px-4 rounded-full inline-block"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))',
          border: '1px solid hsl(var(--primary) / 0.2)',
        }}
      >
        <p className="text-[10px] text-muted-foreground/50">
          Designed & Developed by
        </p>
        <p className="text-sm font-bold text-primary tracking-wide">
          SHASHANK YADAV
        </p>
      </motion.div>
    </footer>
  );
};

export default Footer;
