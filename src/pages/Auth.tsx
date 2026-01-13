import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { iosSpring, iosBounce } from '@/lib/animations';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error, isAdmin } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Welcome back!');
          navigate(isAdmin ? '/admin' : '/home');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Account created successfully!');
          navigate('/home');
        }
      }
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ultra-realistic ambient background with depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(211 100% 50% / 0.15), transparent 60%)',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-1/4 w-[600px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(328 100% 54% / 0.12), transparent 60%)',
            filter: 'blur(80px)',
          }}
          animate={{
            scale: [1.1, 1, 1.1],
            x: [-20, 20, -20],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(280 100% 60% / 0.1), transparent 70%)',
            filter: 'blur(50px)',
          }}
          animate={{
            y: [-30, 30, -30],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={iosSpring}
      >
        {/* Logo with 3D effect */}
        <motion.div 
          className="flex flex-col items-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 0.1 }}
        >
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05, rotateY: 10 }}
            whileTap={{ scale: 0.95 }}
            transition={iosBounce}
          >
            <motion.div 
              className="w-24 h-24 rounded-[28px] flex items-center justify-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(211 100% 50%), hsl(280 100% 60%), hsl(328 100% 54%))',
                boxShadow: '0 20px 60px -10px hsl(211 100% 50% / 0.4), 0 10px 30px -5px hsl(328 100% 54% / 0.3)',
              }}
              animate={{
                boxShadow: [
                  '0 20px 60px -10px hsl(211 100% 50% / 0.4), 0 10px 30px -5px hsl(328 100% 54% / 0.3)',
                  '0 25px 80px -10px hsl(211 100% 50% / 0.5), 0 15px 40px -5px hsl(328 100% 54% / 0.4)',
                  '0 20px 60px -10px hsl(211 100% 50% / 0.4), 0 10px 30px -5px hsl(328 100% 54% / 0.3)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
              <Music className="w-12 h-12 text-white relative z-10" strokeWidth={1.5} />
            </motion.div>
          </motion.div>
          
          <motion.h1 
            className="mt-5 text-4xl font-bold tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="gradient-text">Sonique</span>
          </motion.h1>
          <motion.p
            className="mt-1 text-muted-foreground text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Premium Music Experience
          </motion.p>
        </motion.div>

        {/* iOS-style form card */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="relative rounded-3xl p-8 space-y-6"
          style={{
            background: 'rgba(28, 28, 30, 0.8)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            <motion.div 
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, x: isLogin ? -30 : 30, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: isLogin ? 30 : -30, scale: 0.98 }}
              transition={iosSpring}
            >
              <h2 className="text-2xl font-bold mb-1">{isLogin ? 'Welcome back' : 'Create account'}</h2>
              <p className="text-muted-foreground text-sm">{isLogin ? 'Sign in to continue your music journey' : 'Start your premium music experience'}</p>
            </motion.div>
          </AnimatePresence>

          <div className="space-y-4 pt-2">
            {/* Email input - iOS style */}
            <motion.div 
              className="relative"
              animate={{
                scale: focusedField === 'email' ? 1.01 : 1,
              }}
              transition={iosBounce}
            >
              <motion.div
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                animate={{
                  color: focusedField === 'email' ? 'hsl(211 100% 50%)' : 'hsl(0 0% 55%)',
                  scale: focusedField === 'email' ? 1.1 : 1,
                }}
                transition={iosBounce}
              >
                <Mail className="w-5 h-5" />
              </motion.div>
              <Input 
                type="email" 
                placeholder="Email address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className="pl-12 h-14 text-base rounded-2xl border-0 bg-white/[0.06] focus:bg-white/[0.1] focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                required 
              />
            </motion.div>
            
            {/* Password input - iOS style */}
            <motion.div 
              className="relative"
              animate={{
                scale: focusedField === 'password' ? 1.01 : 1,
              }}
              transition={iosBounce}
            >
              <motion.div
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                animate={{
                  color: focusedField === 'password' ? 'hsl(211 100% 50%)' : 'hsl(0 0% 55%)',
                  scale: focusedField === 'password' ? 1.1 : 1,
                }}
                transition={iosBounce}
              >
                <Lock className="w-5 h-5" />
              </motion.div>
              <Input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="pl-12 pr-12 h-14 text-base rounded-2xl border-0 bg-white/[0.06] focus:bg-white/[0.1] focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                required 
                minLength={6} 
              />
              <motion.button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                whileTap={{ scale: 0.85 }}
                transition={iosBounce}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </motion.button>
            </motion.div>
          </div>

          {/* iOS-style submit button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={iosBounce}
          >
            <Button 
              type="submit" 
              className="w-full h-14 text-base font-semibold rounded-2xl border-0"
              style={{
                background: 'linear-gradient(135deg, hsl(211 100% 50%), hsl(328 100% 54%))',
                boxShadow: '0 8px 30px -5px hsl(211 100% 50% / 0.4)',
              }}
              disabled={loading}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.span 
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              )}
            </Button>
          </motion.div>

          {/* Toggle link */}
          <motion.p 
            className="text-center text-sm text-muted-foreground pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <motion.button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-primary font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </motion.button>
          </motion.p>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default Auth;
