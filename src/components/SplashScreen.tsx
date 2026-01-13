import { motion } from 'framer-motion';
import { iosSpring } from '@/lib/animations';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 bg-black flex items-center justify-center z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onAnimationComplete={() => {
        setTimeout(onComplete, 6000);
      }}
    >
      {/* Animated ambient background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary glow */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(211 100% 50% / 0.3), transparent 60%)',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 0.6, 0.4],
            x: [-50, 50, -50],
            y: [-30, 30, -30],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        {/* Secondary glow */}
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(328 100% 54% / 0.25), transparent 60%)',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.3, 0.5, 0.3],
            x: [30, -30, 30],
            y: [20, -20, 20],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        {/* Tertiary purple glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(270 100% 60% / 0.2), transparent 60%)',
            filter: 'blur(80px)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Animated Logo */}
        <motion.div
          className="relative"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            ...iosSpring,
            delay: 0.2,
          }}
        >
          {/* Outer ring animation */}
          <motion.div
            className="absolute -inset-4 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, hsl(211 100% 50%), hsl(270 100% 60%), hsl(328 100% 54%), hsl(211 100% 50%))',
              opacity: 0.6,
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute -inset-4 rounded-full bg-black/80"
          />
          
          {/* Main logo container */}
          <motion.div
            className="w-32 h-32 rounded-[32px] flex items-center justify-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(211 100% 50%), hsl(270 100% 60%), hsl(328 100% 54%))',
            }}
            animate={{
              boxShadow: [
                "0 0 40px hsl(211 100% 50% / 0.5)",
                "0 0 80px hsl(270 100% 60% / 0.6), 0 0 120px hsl(328 100% 54% / 0.4)",
                "0 0 40px hsl(211 100% 50% / 0.5)",
              ]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Inner highlight */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
            
            {/* Realistic Universe Logo */}
            <motion.div className="relative z-10 flex items-center justify-center w-full h-full">
              {/* Galaxy core glow */}
              <div 
                className="absolute w-20 h-20 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(200,220,255,0.6) 20%, rgba(100,150,255,0.3) 40%, transparent 70%)',
                  filter: 'blur(2px)',
                }}
              />
              
              {/* Spiral galaxy arms */}
              <motion.div
                className="absolute w-24 h-24"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                {[0, 72, 144, 216, 288].map((rotation, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-10 h-1 origin-left"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      background: `linear-gradient(90deg, rgba(200,220,255,0.8), rgba(150,100,255,0.4), transparent)`,
                      borderRadius: '50%',
                      filter: 'blur(1px)',
                    }}
                  />
                ))}
              </motion.div>

              {/* Orbiting stars */}
              <motion.div
                className="absolute w-28 h-28"
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              >
                {[0, 90, 180, 270].map((angle, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-white"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${angle}deg) translateX(52px) translateY(-50%)`,
                      boxShadow: '0 0 6px 2px rgba(255,255,255,0.8)',
                    }}
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.5,
                      repeat: Infinity,
                    }}
                  />
                ))}
              </motion.div>

              {/* Music wave ring */}
              <motion.svg
                width="80"
                height="80"
                viewBox="0 0 80 80"
                className="absolute"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <defs>
                  <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(211, 100%, 70%)" />
                    <stop offset="50%" stopColor="hsl(280, 100%, 70%)" />
                    <stop offset="100%" stopColor="hsl(328, 100%, 70%)" />
                  </linearGradient>
                </defs>
                <motion.circle
                  cx="40"
                  cy="40"
                  r="35"
                  fill="none"
                  stroke="url(#waveGradient)"
                  strokeWidth="1.5"
                  strokeDasharray="8 4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1, rotate: 360 }}
                  transition={{ 
                    pathLength: { duration: 1.5, delay: 0.5 },
                    rotate: { duration: 10, repeat: Infinity, ease: "linear" }
                  }}
                  style={{ transformOrigin: 'center' }}
                />
              </motion.svg>

              {/* Central planet/star */}
              <motion.div
                className="relative w-12 h-12 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #ffffff, #a0c4ff 30%, #6b8cff 60%, #4a6bff 100%)',
                  boxShadow: '0 0 30px 10px rgba(100,150,255,0.5), inset -4px -4px 10px rgba(0,0,50,0.3)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 30px 10px rgba(100,150,255,0.5), inset -4px -4px 10px rgba(0,0,50,0.3)',
                    '0 0 50px 15px rgba(150,100,255,0.6), inset -4px -4px 10px rgba(0,0,50,0.3)',
                    '0 0 30px 10px rgba(100,150,255,0.5), inset -4px -4px 10px rgba(0,0,50,0.3)',
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {/* Planet highlight */}
                <div 
                  className="absolute top-1 left-2 w-3 h-2 rounded-full bg-white/60"
                  style={{ filter: 'blur(2px)' }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Animated waveform */}
        <motion.div
          className="flex items-center justify-center gap-1.5 mt-12 h-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 0.8 }}
        >
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full"
              style={{
                background: `linear-gradient(to top, hsl(211 100% 60%), hsl(328 100% 60%))`,
              }}
              animate={{
                height: [4, 24 + Math.sin(i * 0.8) * 12, 4],
              }}
              transition={{
                duration: 0.6 + Math.random() * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.06,
              }}
            />
          ))}
        </motion.div>

        {/* Brand name - Univers Flow */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 1 }}
        >
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text">Univers</span>
            <span className="text-white ml-2">Flow</span>
          </h1>
        </motion.div>

        <motion.p
          className="mt-3 text-muted-foreground text-sm font-medium tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          Premium Music Experience
        </motion.p>

        {/* Creator credit */}
        <motion.p
          className="mt-8 text-[11px] text-muted-foreground/60 font-medium tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
        >
          by Shashank Yadav
        </motion.p>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
