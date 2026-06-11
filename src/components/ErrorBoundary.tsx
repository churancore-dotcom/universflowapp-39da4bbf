import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global crash catcher. Wraps <App /> so a render error in any descendant
 * shows a recover screen instead of a white page. Errors are also logged
 * to the console so Sentry / Logcat can capture them.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    try { window.location.reload(); } catch { /* ignore */ }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#000',
          color: '#fff',
          fontFamily: '-apple-system, system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Something went wrong
        </div>
        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 24, maxWidth: 320 }}>
          The app hit an unexpected error. Reload to continue.
        </div>
        <button
          onClick={this.handleReload}
          style={{
            background: '#FF2D55',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
