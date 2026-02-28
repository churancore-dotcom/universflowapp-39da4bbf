import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, AlertTriangle, ChevronDown, ChevronUp, X, RefreshCw, Shield, Smartphone, Monitor, Router } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { iosSpring } from '@/lib/animations';

type ConnectionStatus = 'connected' | 'checking' | 'unreachable';

const ConnectionTroubleshoot = memo(function ConnectionTroubleshoot() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [showGuide, setShowGuide] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus('unreachable');
      return;
    }
    setChecking(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const { error } = await supabase.from('songs').select('id', { count: 'exact', head: true }).abortSignal(controller.signal);
      clearTimeout(timeout);
      setStatus(error ? 'unreachable' : 'connected');
    } catch {
      setStatus('unreachable');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  useEffect(() => {
    if (status === 'connected') {
      setShowGuide(false);
      setDismissed(false);
    }
  }, [status]);

  if (status === 'connected' || dismissed) return null;
  if (status === 'checking' && !showGuide) return null;

  const toggleSection = (id: string) => {
    setExpandedSection(prev => prev === id ? null : id);
  };

  const sections = [
    {
      id: 'dns',
      icon: <Shield className="w-4 h-4 text-blue-400" />,
      title: 'Change DNS Settings (Recommended)',
      content: (
        <div className="space-y-3 text-xs text-muted-foreground">
          <p>Your WiFi provider may be blocking our servers. Changing DNS fixes this in most cases.</p>
          <div className="rounded-lg p-3 space-y-1" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <p className="font-semibold text-blue-400 text-[11px] uppercase tracking-wide">Google DNS</p>
            <p className="font-mono text-sm text-foreground">8.8.8.8</p>
            <p className="font-mono text-sm text-foreground">8.8.4.4</p>
          </div>
          <div className="rounded-lg p-3 space-y-1" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <p className="font-semibold text-blue-400 text-[11px] uppercase tracking-wide">Cloudflare DNS</p>
            <p className="font-mono text-sm text-foreground">1.1.1.1</p>
            <p className="font-mono text-sm text-foreground">1.0.0.1</p>
          </div>
        </div>
      ),
    },
    {
      id: 'android',
      icon: <Smartphone className="w-4 h-4 text-green-400" />,
      title: 'Android Setup',
      content: (
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li>Open <span className="text-foreground font-medium">Settings → Network & Internet → Private DNS</span></li>
          <li>Select <span className="text-foreground font-medium">"Private DNS provider hostname"</span></li>
          <li>Enter <span className="font-mono text-foreground">dns.google</span> or <span className="font-mono text-foreground">one.one.one.one</span></li>
          <li>Tap Save and restart the app</li>
        </ol>
      ),
    },
    {
      id: 'iphone',
      icon: <Smartphone className="w-4 h-4 text-gray-300" />,
      title: 'iPhone / iPad Setup',
      content: (
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li>Go to <span className="text-foreground font-medium">Settings → Wi-Fi</span></li>
          <li>Tap the <span className="text-foreground font-medium">ⓘ</span> next to your network</li>
          <li>Scroll to <span className="text-foreground font-medium">Configure DNS → Manual</span></li>
          <li>Remove existing servers, add <span className="font-mono text-foreground">8.8.8.8</span> and <span className="font-mono text-foreground">8.8.4.4</span></li>
          <li>Tap Save</li>
        </ol>
      ),
    },
    {
      id: 'router',
      icon: <Router className="w-4 h-4 text-orange-400" />,
      title: 'WiFi Router Setup',
      content: (
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li>Open router admin page (usually <span className="font-mono text-foreground">192.168.1.1</span>)</li>
          <li>Find <span className="text-foreground font-medium">DNS Settings</span> (under WAN or Internet)</li>
          <li>Set Primary DNS to <span className="font-mono text-foreground">8.8.8.8</span></li>
          <li>Set Secondary DNS to <span className="font-mono text-foreground">8.8.4.4</span></li>
          <li>Save and restart router — all devices will be fixed</li>
        </ol>
      ),
    },
    {
      id: 'pc',
      icon: <Monitor className="w-4 h-4 text-purple-400" />,
      title: 'Windows / Mac Setup',
      content: (
        <div className="space-y-2 text-xs text-muted-foreground">
          <p><span className="text-foreground font-medium">Windows:</span> Control Panel → Network → Adapter → Properties → IPv4 → Use: 8.8.8.8 / 8.8.4.4</p>
          <p><span className="text-foreground font-medium">Mac:</span> System Settings → Network → Wi-Fi → Details → DNS → Add 8.8.8.8 and 8.8.4.4</p>
        </div>
      ),
    },
  ];

  return (
    <AnimatePresence>
      {!showGuide ? (
        <motion.div
          key="banner"
          className="fixed top-0 inset-x-0 z-[300] flex justify-center safe-area-pt"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={iosSpring}
        >
          <motion.div
            className="mx-4 mt-4 px-4 py-3 rounded-2xl flex items-center gap-3 w-full max-w-md"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-400">Can't reach server</p>
              <p className="text-[11px] text-red-400/70">Your WiFi may be blocking the connection</p>
            </div>
            <button
              onClick={() => setShowGuide(true)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-white flex-shrink-0"
              style={{ background: 'rgba(239, 68, 68, 0.4)' }}
            >
              Fix it
            </button>
            <button onClick={() => setDismissed(true)} className="p-1 -mr-1">
              <X className="w-4 h-4 text-red-400/60" />
            </button>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="guide"
          className="fixed inset-0 z-[400] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
          <motion.div
            className="relative mt-auto max-h-[85dvh] flex flex-col rounded-t-3xl overflow-hidden"
            style={{ background: 'rgba(20, 20, 22, 0.98)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={iosSpring}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-5 pb-4 pt-2 flex items-start gap-3 border-b border-white/[0.06]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                <WifiOff className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold">Connection Troubleshooting</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Some WiFi networks block our servers. Follow the steps below to fix it.
                </p>
              </div>
              <button onClick={() => setShowGuide(false)} className="p-1 -mt-0.5 -mr-1">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              {sections.map((s) => (
                <div key={s.id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(28, 28, 30, 0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => toggleSection(s.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 active:bg-white/5"
                  >
                    {s.icon}
                    <span className="text-sm font-medium flex-1 text-left">{s.title}</span>
                    {expandedSection === s.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedSection === s.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-white/[0.06]">
                          {s.content}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/[0.06] safe-area-pb">
              <button
                onClick={() => { checkConnection(); }}
                disabled={checking}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'rgb(96, 165, 250)' }}
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking...' : 'Retry Connection'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ConnectionTroubleshoot.displayName = 'ConnectionTroubleshoot';

export default ConnectionTroubleshoot;
