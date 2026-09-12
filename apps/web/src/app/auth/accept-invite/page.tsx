'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Zap, UserPlus, AlertCircle, CheckCircle2, Loader2, Lock, Eye, EyeOff, Shield } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface InvitationDetails {
  email: string;
  role: string;
  organizationName: string;
  invitedBy: string;
  expiresAt?: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  devops_engineer: 'DevOps Engineer',
  sre_engineer: 'SRE Engineer',
  security_engineer: 'Security Engineer',
  developer: 'Developer',
  viewer: 'Viewer',
};

function AcceptInviteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. No token provided.');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/v1/auth/invitations/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Invalid or expired invitation');
        }
        return res.json();
      })
      .then((data: InvitationDetails) => {
        setInvitation(data);
        // Pre-fill name from email
        const emailName = data.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        setName(emailName);
      })
      .catch((err) => {
        setError(err.message || 'Failed to validate invitation');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/accept-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to accept invitation');
      }

      setSuccess(true);

      // Now sign in with the newly created credentials
      setTimeout(async () => {
        const result = await signIn('credentials', {
          redirect: false,
          email: invitation!.email,
          password,
          callbackUrl: '/dashboard',
        });

        if (result?.url) {
          router.push(result.url);
        } else {
          router.push('/dashboard');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="get-started-page" role="status" aria-label="Validating invitation">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader2 size={32} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite' }} />
          <span className="text-muted text-sm">Validating invitation…</span>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="get-started-page">
        <div className="get-started-bg" aria-hidden="true" />
        <div className="get-started-grid-pattern" aria-hidden="true" />
        <main className="get-started-container" role="main">
          <div className="get-started-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 color="#10b981" size={32} />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Welcome aboard!</h1>
            <p className="text-secondary" style={{ marginBottom: '0.5rem' }}>
              You've joined <strong>{invitation?.organizationName}</strong> as <strong>{ROLE_LABELS[invitation?.role || ''] || invitation?.role}</strong>
            </p>
            <p className="text-muted text-sm">Redirecting to your dashboard…</p>
            <Loader2 size={20} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite', margin: '1rem auto 0' }} />
          </div>
        </main>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="get-started-page">
        <div className="get-started-bg" aria-hidden="true" />
        <div className="get-started-grid-pattern" aria-hidden="true" />
        <main className="get-started-container" role="main">
          <div className="get-started-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <AlertCircle color="#ef4444" size={32} />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Invalid Invitation</h1>
            <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>{error}</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="auth-btn auth-btn-email"
              style={{ maxWidth: '280px', margin: '0 auto' }}
            >
              Go to Sign In
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="get-started-page">
      <div className="get-started-bg" aria-hidden="true" />
      <div className="get-started-grid-pattern" aria-hidden="true" />

      <main className="get-started-container" role="main">
        <div className="get-started-card">
          {/* Logo */}
          <div className="get-started-logo">
            <div className="get-started-logo-icon" aria-hidden="true">
              <Zap size={24} color="white" fill="white" />
            </div>
            <span className="get-started-logo-text">
              DevIntel<span className="gradient-text">AI</span>
            </span>
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserPlus color="white" size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.125rem' }}>
                Join {invitation.organizationName}
              </h1>
              <p className="text-muted" style={{ fontSize: '0.8125rem', margin: 0 }}>
                Invited by {invitation.invitedBy} as <strong>{ROLE_LABELS[invitation.role] || invitation.role}</strong>
              </p>
            </div>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Email (read-only) */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                Email
              </label>
              <input
                type="email"
                value={invitation.email}
                disabled
                className="email-input"
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            {/* Name */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="email-input"
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                Set Password
              </label>
              <div className="email-input-wrapper" style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min 4 characters)"
                  className="email-input"
                  required
                  minLength={4}
                  autoComplete="new-password"
                />
                <Lock size={16} className="email-input-icon" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Role info */}
            <div style={{
              padding: '0.75rem',
              borderRadius: '0.625rem',
              background: 'rgba(139,92,246,0.06)',
              border: '1px solid rgba(139,92,246,0.15)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}>
              <Shield size={14} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle', color: '#8b5cf6' }} />
              You will be assigned the <strong style={{ color: '#a78bfa' }}>{ROLE_LABELS[invitation.role] || invitation.role}</strong> role with corresponding access permissions.
            </div>

            <button
              type="submit"
              className="auth-btn auth-btn-email"
              disabled={submitting || !name.trim() || password.length < 4}
              aria-busy={submitting}
              style={{ marginTop: '0.25rem' }}
            >
              <span className="auth-btn-icon">
                {submitting ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <UserPlus size={18} />
                )}
              </span>
              {submitting ? 'Creating your account…' : 'Accept Invitation & Join'}
            </button>
          </form>

          {/* Security footer */}
          <div className="auth-security-notice" style={{ marginTop: '1.5rem' }}>
            <Shield size={12} aria-hidden="true" />
            <span>Secured with enterprise-grade encryption</span>
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="get-started-page" role="status" aria-label="Loading">
          <Loader2 size={32} style={{ color: 'var(--accent-purple)', animation: 'spin 1s linear infinite' }} />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
