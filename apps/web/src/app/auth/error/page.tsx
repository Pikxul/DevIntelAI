'use client';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Server Configuration Error',
    description:
      'The authentication provider is not configured correctly. Please contact your administrator or check that GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set.',
  },
  AccessDenied: {
    title: 'Access Denied',
    description:
      'You do not have permission to sign in. Your account may not be authorised for this platform.',
  },
  Verification: {
    title: 'Verification Failed',
    description:
      'The sign-in link may have expired or already been used. Please request a new one.',
  },
  OAuthSignin: {
    title: 'OAuth Sign-In Error',
    description:
      'There was a problem initiating the OAuth flow. Please try again or use a different browser.',
  },
  OAuthCallback: {
    title: 'OAuth Callback Error',
    description:
      'An error occurred while completing the OAuth flow. This can happen if you cancelled the authorisation or if the callback URL is misconfigured.',
  },
  OAuthCreateAccount: {
    title: 'Account Creation Failed',
    description:
      'We could not create an account with your OAuth provider details. Please try again.',
  },
  EmailCreateAccount: {
    title: 'Account Creation Failed',
    description: 'We could not create an account with this email address.',
  },
  Callback: {
    title: 'Callback Error',
    description:
      'Something went wrong during the authentication callback. Please try signing in again.',
  },
  Default: {
    title: 'Authentication Error',
    description:
      'An unexpected error occurred during sign-in. Please try again. If the problem persists, contact support.',
  },
};

function AuthErrorContent() {
  const params = useSearchParams();
  const errorCode = params.get('error') ?? 'Default';
  const info = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(239,68,68,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="card card-glow"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '3rem 2.5rem',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '2rem',
          }}
        >
          <div
            className="logo-icon"
            style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={24} className="text-amber-500 fill-amber-500" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.5rem' }}>
            DevIntel<span className="gradient-text">AI</span>
          </span>
        </div>

        {/* Error icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <AlertTriangle size={28} style={{ color: '#ef4444' }} />
        </div>

        <h1 style={{ fontSize: '1.375rem', marginBottom: '0.75rem' }}>{info.title}</h1>

        <p
          className="text-secondary"
          style={{ marginBottom: '0.5rem', fontSize: '0.9rem', lineHeight: 1.6 }}
        >
          {info.description}
        </p>

        {errorCode !== 'Default' && (
          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '2rem' }}>
            Error code: <code style={{ fontFamily: 'var(--font-mono)' }}>{errorCode}</code>
          </p>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginTop: '2rem',
          }}
        >
          <Link
            href="/auth/signin"
            className="btn btn-primary"
            id="try-again-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
            }}
          >
            <RefreshCw size={16} /> Try Again
          </Link>

          <Link
            href="/"
            id="go-home-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
