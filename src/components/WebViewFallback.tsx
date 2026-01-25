import { useEffect, useState } from 'react';

interface WebViewFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
}

const WebViewFallback = ({ error, onRetry }: WebViewFallbackProps) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (onRetry) {
      onRetry();
    }
  }, [countdown, onRetry]);

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        color: '#fff',
        textAlign: 'center',
      }}
    >
      {/* Simple logo */}
      <div 
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #ec4899)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '32px',
        }}
      >
        ♪
      </div>
      
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
        Univers Flow
      </h1>
      
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
        Loading your music experience...
      </p>

      {error && (
        <div 
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
            maxWidth: '300px',
          }}
        >
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            Something went wrong. Retrying in {countdown}s...
          </p>
        </div>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '999px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Retry Now
        </button>
      )}
    </div>
  );
};

export default WebViewFallback;
