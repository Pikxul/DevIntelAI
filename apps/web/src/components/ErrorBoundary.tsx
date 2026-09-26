'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '16px',
            padding: '3rem',
            maxWidth: '480px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
            }}>
              ⚠️
            </div>
            <h2 style={{
              color: '#ef4444',
              fontSize: '1.25rem',
              fontWeight: 600,
              margin: '0 0 0.75rem 0',
            }}>
              Something went wrong
            </h2>
            <p style={{
              color: '#94a3b8',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              margin: '0 0 1.5rem 0',
            }}>
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '1rem',
                fontSize: '0.75rem',
                color: '#f87171',
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: '120px',
                marginBottom: '1.5rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
