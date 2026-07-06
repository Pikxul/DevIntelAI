'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Mail, ArrowLeft, AlertCircle, Shield, Loader2 } from 'lucide-react';
import { useState, useCallback, useEffect, useRef, Suspense, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/* ─── Constants ────────────────────────────────────────────────────────────── */

/** Allowed email domains. Empty array = allow all domains. */
const BLOCKED_EMAIL_DOMAINS: string[] = [];

/** Max auth attempts within the rate limit window */
const MAX_ATTEMPTS = 5;
/** Rate limit window (ms) */
const RATE_LIMIT_WINDOW = 60_000;

/** Email validation regex — RFC 5322 simplified */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Maximum email length to prevent DoS with absurdly long strings */
const MAX_EMAIL_LENGTH = 254;

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.08-.2-.15-.42-.2-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="auth-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/* ─── Email validation ─────────────────────────────────────────────────────── */

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an email address with security-conscious checks:
 * - Length limit to prevent DoS
 * - Format validation (RFC 5322 simplified)
 * - Domain blocklist check
 * - XSS pattern rejection
 */
function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();

  if (!trimmed) {
    return { valid: false, error: 'Please enter your email address.' };
  }

  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: 'Email address is too long.' };
  }

  // Reject potential XSS payloads in email field
  if (/[<>"'`;()]/.test(trimmed)) {
    return { valid: false, error: 'Email contains invalid characters.' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  // Extract domain and check blocklist
  const domain = trimmed.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  if (BLOCKED_EMAIL_DOMAINS.length > 0 && BLOCKED_EMAIL_DOMAINS.includes(domain)) {
    return { valid: false, error: 'Please use your organization email address.' };
  }

  return { valid: true };
}

/**
 * Sanitize email input — strip control characters and limit length.
 */
function sanitizeEmail(value: string): string {
  // Remove control characters, null bytes, and non-printable chars
  return value.replace(/[\x00-\x1F\x7F]/g, '').slice(0, MAX_EMAIL_LENGTH);
}

/* ─── Main Content ─────────────────────────────────────────────────────────── */

function SignInContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isEmailMode = params.get('method') === 'email';
  const callbackError = params.get('error');

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  // Rate limiting
  const attemptsRef = useRef<number[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);

  /**
   * Edge case: Redirect authenticated users away from sign-in page.
   */
  useEffect(() => {
    if (status === 'authenticated' && session) {
      const isNewUser = (session as any).isNewUser;
      const hasOrg = !!(session as any).organizationId;
      if (isNewUser || !hasOrg) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [status, session, router]);

  /**
   * Auto-focus email input when in email mode
   */
  useEffect(() => {
    if (isEmailMode && emailInputRef.current) {
      // Slight delay to ensure DOM is ready after animation
      const timer = setTimeout(() => emailInputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isEmailMode]);

  /**
   * Set callback error as general error
   */
  useEffect(() => {
    if (callbackError) {
      setGeneralError('Sign-in failed. Please try again or contact your administrator.');
    }
  }, [callbackError]);

  const isRateLimited = useCallback((): boolean => {
    const now = Date.now();
    attemptsRef.current = attemptsRef.current.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW
    );
    if (attemptsRef.current.length >= MAX_ATTEMPTS) {
      return true;
    }
    attemptsRef.current.push(now);
    return false;
  }, []);

  /**
   * Handles OAuth sign-in (Google).
   * Forces account picker for fresh session selection.
   */
  const handleOAuthSignIn = useCallback(async (provider: string) => {
    if (loadingProvider) return;

    if (isRateLimited()) {
      setGeneralError('Too many attempts. Please wait a moment before trying again.');
      return;
    }

    setGeneralError(null);
    setLoadingProvider(provider);

    try {
      // Sign out first to force a fresh OAuth flow
      await signOut({ redirect: false });

      if (provider === 'google') {
        await signIn('google', {
          callbackUrl: '/onboarding',
        }, {
          prompt: 'select_account',
        });
      } else {
        await signIn(provider, { callbackUrl: '/onboarding' });
      }
    } catch (err) {
      setGeneralError('Failed to initiate sign-in. Please try again.');
      setLoadingProvider(null);
    }
  }, [loadingProvider, isRateLimited]);

  /**
   * Handles email form submission.
   * Validates and sanitizes the email before passing to credentials provider.
   * The actual backend authentication is wired in Ticket 2.
   */
  const handleEmailSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loadingProvider) return;

    const sanitized = sanitizeEmail(email);
    const validation = validateEmail(sanitized);

    if (!validation.valid) {
      setEmailError(validation.error ?? 'Invalid email.');
      setEmailTouched(true);
      return;
    }

    if (isRateLimited()) {
      setGeneralError('Too many attempts. Please wait a moment before trying again.');
      return;
    }

    setEmailError(null);
    setGeneralError(null);
    setLoadingProvider('email');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: sanitized,
        password: '', // password flow handled in Ticket 2
        callbackUrl: '/onboarding',
      });

      if (result?.error) {
        setGeneralError('Authentication failed. Please verify your email or contact your organization admin.');
        setLoadingProvider(null);
      } else if (result?.url) {
        router.push(result.url);
      } else {
        router.push('/onboarding');
      }
    } catch (err) {
      setGeneralError('An unexpected error occurred. Please try again.');
      setLoadingProvider(null);
    }
  }, [email, loadingProvider, isRateLimited, router]);

  /**
   * Handle email input change with sanitization
   */
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeEmail(e.target.value);
    setEmail(sanitized);

    // Clear errors on edit for better UX
    if (emailError) {
      const validation = validateEmail(sanitized);
      if (validation.valid) {
        setEmailError(null);
      }
    }
  }, [emailError]);

  /**
   * Handle email blur — validate when user leaves the field
   */
  const handleEmailBlur = useCallback(() => {
    setEmailTouched(true);
    if (email.trim()) {
      const validation = validateEmail(email.trim());
      if (!validation.valid) {
        setEmailError(validation.error ?? 'Invalid email.');
      } else {
        setEmailError(null);
      }
    }
  }, [email]);

  const isDevMode = process.env.NODE_ENV === 'development';

  // Loading state while checking session
  if (status === 'loading') {
    return (
      <div className="get-started-page" role="status" aria-label="Loading">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader2 size={32} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite' }} />
          <span className="text-muted text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  // Redirect state for authenticated users
  if (status === 'authenticated') {
    return (
      <div className="get-started-page" role="status" aria-label="Redirecting">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader2 size={32} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite' }} />
          <span className="text-muted text-sm">Redirecting…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="get-started-page">
      {/* Background */}
      <div className="get-started-bg" aria-hidden="true" />
      <div className="get-started-grid-pattern" aria-hidden="true" />

      <main className="get-started-container" role="main">
        <motion.div
          className="get-started-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <div className="get-started-logo">
            <div className="get-started-logo-icon" aria-hidden="true">
              <Zap size={24} color="white" fill="white" />
            </div>
            <span className="get-started-logo-text">
              DevIntel<span className="gradient-text">AI</span>
            </span>
          </div>

          {/* Back link — only shown in email mode */}
          {isEmailMode && (
            <Link href="/" className="auth-back-link" aria-label="Go back to Get Started">
              <ArrowLeft size={14} aria-hidden="true" />
              Back
            </Link>
          )}

          {/* Dynamic heading */}
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {isEmailMode ? 'Sign in with your organization email' : 'Sign in to DevIntel AI'}
          </h1>
          <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '0.9375rem' }}>
            {isEmailMode
              ? 'Enter the email associated with your organization'
              : 'Access your AI-powered DevOps dashboard'
            }
          </p>

          {/* Error banners */}
          {generalError && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{generalError}</span>
            </div>
          )}

          {isEmailMode ? (
            /* ─── Email Mode ──────────────────────────────────── */
            <form
              className="email-form"
              onSubmit={handleEmailSubmit}
              noValidate
              autoComplete="on"
            >
              <div className="email-input-wrapper">
                <input
                  ref={emailInputRef}
                  id="signin-email-input"
                  type="email"
                  className="email-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  disabled={loadingProvider !== null}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  aria-label="Organization email address"
                  aria-invalid={emailTouched && !!emailError}
                  aria-describedby={emailError ? 'email-error-msg' : undefined}
                  maxLength={MAX_EMAIL_LENGTH}
                  required
                />
                <Mail size={16} className="email-input-icon" aria-hidden="true" />
              </div>

              {emailTouched && emailError && (
                <div id="email-error-msg" className="email-error" role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{emailError}</span>
                </div>
              )}

              <button
                id="signin-email-submit-btn"
                type="submit"
                className="auth-btn auth-btn-email"
                disabled={loadingProvider !== null || (emailTouched && !!emailError)}
                aria-busy={loadingProvider === 'email'}
              >
                <span className="auth-btn-icon">
                  {loadingProvider === 'email' ? <Spinner /> : <Mail size={18} />}
                </span>
                {loadingProvider === 'email' ? 'Signing in…' : 'Continue'}
              </button>

              <div className="auth-divider" aria-hidden="true">
                <span>or</span>
              </div>

              {/* Google as alternative in email mode */}
              <button
                id="signin-google-btn"
                type="button"
                className="auth-btn auth-btn-google"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loadingProvider !== null}
                aria-label="Continue with Google instead"
                aria-busy={loadingProvider === 'google'}
              >
                <span className="auth-btn-icon">
                  {loadingProvider === 'google' ? <Spinner /> : <GoogleIcon />}
                </span>
                {loadingProvider === 'google' ? 'Redirecting…' : 'Continue with Google'}
              </button>
            </form>
          ) : (
            /* ─── Default Mode: OAuth Buttons ─────────────────── */
            <>
              {/* Continue with Google */}
              <button
                id="signin-google-btn"
                className="auth-btn auth-btn-google"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loadingProvider !== null}
                aria-label="Continue with Google"
                aria-busy={loadingProvider === 'google'}
              >
                <span className="auth-btn-icon">
                  {loadingProvider === 'google' ? <Spinner /> : <GoogleIcon />}
                </span>
                {loadingProvider === 'google' ? 'Redirecting to Google…' : 'Continue with Google'}
              </button>

              <div className="auth-divider" aria-hidden="true">
                <span>or</span>
              </div>

              {/* Continue with Org mail */}
              <button
                id="signin-email-btn"
                className="auth-btn auth-btn-email"
                onClick={() => router.push('/auth/signin?method=email')}
                disabled={loadingProvider !== null}
                aria-label="Continue with organization email"
              >
                <span className="auth-btn-icon">
                  <Mail size={20} />
                </span>
                Continue with Org mail
              </button>
            </>
          )}

          {/* Dev Bypass — only in development */}
          {isDevMode && (
            <>
              <div className="auth-divider" aria-hidden="true">
                <span>dev only</span>
              </div>
              <button
                id="signin-dev-bypass-btn"
                className="auth-btn"
                onClick={() => {
                  if (loadingProvider) return;
                  setLoadingProvider('credentials');
                  signIn('credentials', {
                    email: 'dev@acme.com',
                    password: '',
                    callbackUrl: '/onboarding',
                  });
                }}
                disabled={loadingProvider !== null}
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  borderStyle: 'dashed',
                }}
                aria-label="Developer bypass login"
              >
                <span className="auth-btn-icon">
                  {loadingProvider === 'credentials' ? <Spinner /> : <Zap size={18} />}
                </span>
                {loadingProvider === 'credentials' ? 'Bypassing…' : 'Dev Bypass Login'}
              </button>
            </>
          )}

          {/* Security footer */}
          <div className="auth-security-notice">
            <Shield size={12} aria-hidden="true" />
            <span>Secured with enterprise-grade encryption</span>
          </div>

          {/* Terms */}
          <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.75rem', lineHeight: 1.5 }}>
            By continuing, you agree to our{' '}
            <a href="/terms" style={{ color: 'var(--text-secondary)' }}>terms of service</a>{' '}
            and{' '}
            <a href="/privacy" style={{ color: 'var(--text-secondary)' }}>privacy policy</a>.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="get-started-page" role="status" aria-label="Loading sign-in">
          <Loader2 size={32} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite' }} />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
