'use client';
import { signIn, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Zap, Github, Terminal, AlertCircle } from 'lucide-react';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SignInContent() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const params = useSearchParams();
  const callbackError = params.get('error');

  const handleSignIn = async (provider: string) => {
    setLoadingProvider(provider);

    if (activeTab === 'signup') {
      // Clear any existing session first so OAuth starts fresh.
      // Without this, NextAuth silently reuses the current session
      // and the user gets logged in as the old account.
      await signOut({ redirect: false });

      // Force the provider's account picker / login screen
      if (provider === 'google') {
        signIn(provider, { callbackUrl: '/dashboard' }, { prompt: 'select_account' });
      } else if (provider === 'github') {
        signIn(provider, { callbackUrl: '/dashboard' }, { login: '' });
      } else {
        signIn(provider, { callbackUrl: '/dashboard' });
      }
    } else {
      signIn(provider, { callbackUrl: '/dashboard' });
    }
  };

  const isDevMode = process.env.NODE_ENV === 'development';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card card-glow"
        style={{ width: '100%', maxWidth: 420, padding: '3rem 2.5rem', textAlign: 'center' }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div className="logo-icon" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={24} className="text-amber-500 fill-amber-500" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.5rem' }}>
            DevIntel<span className="gradient-text">AI</span>
          </span>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '0.25rem',
          marginBottom: '2rem',
          position: 'relative',
        }}>
          {(['signin', 'signup'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  if (loadingProvider === null) setActiveTab(tab);
                }}
                style={{
                  flex: 1,
                  padding: '0.625rem 1rem',
                  borderRadius: 'calc(var(--radius-md) - 2px)',
                  border: 'none',
                  background: 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1,
                  transition: 'color 0.2s ease',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: 'inherit',
                      zIndex: -1,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {tab === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            );
          })}
        </div>

        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          {activeTab === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-secondary" style={{ marginBottom: '2.5rem', fontSize: '0.9375rem' }}>
          {activeTab === 'signin' ? 'Sign in to your AI DevOps dashboard' : 'Start managing your AI DevOps pipeline'}
        </p>

        {/* Callback error banner */}
        {callbackError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
            marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.875rem', color: '#f87171',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            Sign-in failed. Please try again or contact your administrator.
          </div>
        )}

        {/* Primary: GitHub OAuth */}
        <button
          id="signin-github-btn"
          onClick={() => handleSignIn('github')}
          disabled={loadingProvider !== null}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            padding: '0.875rem 1.5rem',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600, fontSize: '0.9375rem',
            cursor: loadingProvider !== null ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: '0.75rem',
            opacity: loadingProvider && loadingProvider !== 'github' ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!loadingProvider) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {loadingProvider === 'github' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <Github size={20} />
          )}
          {loadingProvider === 'github' ? (
            activeTab === 'signin' ? 'Redirecting to GitHub…' : 'Setting up account…'
          ) : (
            activeTab === 'signin' ? 'Log In with GitHub' : 'Sign Up with GitHub'
          )}
        </button>

        {/* Primary: Google OAuth */}
        <button
          id="signin-google-btn"
          onClick={() => handleSignIn('google')}
          disabled={loadingProvider !== null}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            padding: '0.875rem 1.5rem',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600, fontSize: '0.9375rem',
            cursor: loadingProvider !== null ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: '0.75rem',
            opacity: loadingProvider && loadingProvider !== 'google' ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!loadingProvider) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {loadingProvider === 'google' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.08-.2-.15-.42-.2-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          )}
          {loadingProvider === 'google' ? (
            activeTab === 'signin' ? 'Redirecting to Google…' : 'Setting up account…'
          ) : (
            activeTab === 'signin' ? 'Log In with Google' : 'Sign Up with Google'
          )}
        </button>

        {/* Dev Mode Bypass */}
        {isDevMode && (
          <button
            onClick={() => handleSignIn('credentials')}
            disabled={loadingProvider !== null}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              padding: '0.875rem 1.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px dashed rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: '0.9375rem',
              cursor: loadingProvider !== null ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              marginTop: '1rem',
            }}
          >
            <Terminal size={20} />
            {loadingProvider === 'credentials' ? 'Bypassing...' : 'Dev Bypass Login'}
          </button>
        )}

        <p className="text-muted" style={{ marginTop: '1.5rem', fontSize: '0.8125rem', lineHeight: 1.5 }}>
          {activeTab === 'signin' ? 'By signing in you agree to our ' : 'By creating an account you agree to our '}
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>terms of service</a>.
        </p>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
