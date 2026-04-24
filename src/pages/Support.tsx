import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Heart, Coffee, Crown, Star, ExternalLink, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';
import { iosSpring, iosBounce } from '@/lib/animations';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import Footer from '@/components/Footer';

const Support = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = usePremium();

  const donationLinks = [
    {
      name: 'Ko-fi',
      description: 'Buy me a coffee',
      icon: Coffee,
      color: 'rgba(255, 94, 91, 0.9)',
      url: 'https://ko-fi.com/yourprofile', // Replace with your Ko-fi URL
    },
    {
      name: 'Buy Me a Coffee',
      description: 'Support my work',
      icon: Gift,
      color: 'rgba(255, 221, 0, 0.9)',
      url: 'https://buymeacoffee.com/yourprofile', // Replace with your BMC URL
    },
  ];

  const premiumFeatures = [
    { icon: '🎵', title: 'Ad-Free Listening', description: 'Enjoy music without interruptions' },
    { icon: '📥', title: 'Offline Downloads', description: 'Listen anywhere, anytime' },
    { icon: '🎧', title: 'High-Quality Audio', description: 'Up to 320kbps audio quality' },
    { icon: '⭐', title: 'Exclusive Content', description: 'Access premium-only tracks' },
  ];

  return (
    <PageTransition>
      <motion.div 
        className="min-h-screen bg-black pb-44"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* iOS-style header */}
        <motion.header
          className="sticky top-0 z-30 px-2 pt-4 pb-3 flex items-center safe-area-pt"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={iosSpring}
        >
          <motion.button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-2 py-2 -ml-1 text-primary"
            whileTap={{ scale: 0.95, opacity: 0.7 }}
            transition={iosBounce}
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-[17px]">Back</span>
          </motion.button>
          <motion.h1 
            className="text-[17px] font-semibold absolute left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Support
          </motion.h1>
        </motion.header>

        <main className="px-5 pt-6 space-y-8">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...iosSpring, delay: 0.05 }}
            className="text-center py-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...iosSpring, delay: 0.1 }}
              className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))',
              }}
            >
              <Heart className="w-12 h-12 text-primary-foreground" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">Support Sonique</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Help us keep the music playing. Your support keeps this app free and helps us add new features.
            </p>
          </motion.section>

          {/* Premium Status */}
          {isPremium && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...iosSpring, delay: 0.1 }}
              className="rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1))',
                border: '1px solid hsl(var(--primary) / 0.3)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <Crown className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-primary">Premium Member</p>
                  <p className="text-sm text-muted-foreground">Thank you for your support! 💜</p>
                </div>
              </div>
            </motion.section>
          )}

          {/* Premium Features */}
          {!isPremium && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...iosSpring, delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Premium Features
              </h3>
              <div 
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(28, 28, 30, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {premiumFeatures.map((feature, index) => (
                  <div 
                    key={feature.title}
                    className={`px-5 py-4 flex items-center gap-4 ${
                      index < premiumFeatures.length - 1 ? 'border-b border-white/[0.06]' : ''
                    }`}
                  >
                    <span className="text-2xl">{feature.icon}</span>
                    <div>
                      <p className="font-medium">{feature.title}</p>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full mt-4 py-4 rounded-2xl font-semibold text-lg"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                }}
              >
                Upgrade to Premium
              </motion.button>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Available when you download the mobile app
              </p>
            </motion.section>
          )}

          {/* Donation Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...iosSpring, delay: 0.15 }}
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Buy Me a Coffee
            </h3>
            <div className="grid gap-3">
              {donationLinks.map((link, index) => (
                <motion.a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...iosSpring, delay: 0.2 + index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{
                    background: 'rgba(28, 28, 30, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: link.color }}
                  >
                    <link.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{link.name}</p>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground" />
                </motion.a>
              ))}
            </div>
          </motion.section>

          {/* Supporters Wall (Optional) */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...iosSpring, delay: 0.25 }}
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Our Supporters
            </h3>
            <div 
              className="rounded-2xl p-6 text-center"
              style={{
                background: 'rgba(28, 28, 30, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <p className="text-muted-foreground mb-4">
                Be the first to support Sonique and get featured here!
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                {['💜', '🎵', '🎧', '✨', '🌟'].map((emoji, i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="text-2xl"
                  >
                    {emoji}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Footer */}
          <Footer />
        </main>

        <BottomNav />
      </motion.div>
    </PageTransition>
  );
};

export default Support;
