'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, Loader2, Eye, EyeOff, CheckCircle2, Zap, ShieldCheck } from 'lucide-react';
import { useState, useCallback, useEffect, type FormEvent } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function FirstLoginPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getToken = useCallback((): string | null => {
    // Try session token first, then localStorage fallback
    return (session as any)?.accessToken || localStorage.getItem('devintel_token') || null;
  }, [session]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Current (temporary) password is required');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from the current password');
      return;
    }

    const token = getToken();
    if (!token) {
      setError('Authentication session expired. Please sign in again.');
      router.push('/auth/signin');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Password change failed');
      }

      const data = await res.json();

      // Update stored token
      if (data.token) {
        localStorage.setItem('devintel_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('devintel_user', JSON.stringify(data.user));
      }

      setSuccess(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Password change failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, getToken, router]);

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-bg-effects">
          <div className="auth-gradient-orb auth-gradient-orb-1" />
          <div className="auth-gradient-orb auth-gradient-orb-2" />
        </div>
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              <CheckCircle2 size={56} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
            </motion.div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Password Updated!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
              Redirecting to your dashboard...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-effects">
        <div className="auth-gradient-orb auth-gradient-orb-1" />
        <div className="auth-gradient-orb auth-gradient-orb-2" />
      </div>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ maxWidth: '420px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Zap size={28} style={{ color: '#818cf8' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>DevIntel</span>
          </div>
          <ShieldCheck size={40} style={{ color: '#f59e0b', margin: '0 auto 0.75rem' }} />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            Set Your New Password
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Your administrator provided you with a temporary password.
            <br />Please set a new password to secure your account.
          </p>
        </div>

        {error && (
          <motion.div
            className="auth-error-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Current/Temporary Password */}
          <div className="auth-field">
            <label className="auth-label">
              <Lock size={14} style={{ opacity: 0.5 }} />
              Temporary Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="auth-input"
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter the password you were given"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                }}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="auth-field">
            <label className="auth-label">
              <Lock size={14} style={{ opacity: 0.5 }} />
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="auth-input"
                type={showNew ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="auth-field">
            <label className="auth-label">
              <Lock size={14} style={{ opacity: 0.5 }} />
              Confirm New Password
            </label>
            <input
              className="auth-input"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Password strength hints */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ color: newPassword.length >= 8 ? '#10b981' : undefined }}>
              {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
            </span>
            <span style={{ color: newPassword && newPassword === confirmPassword ? '#10b981' : undefined }}>
              {newPassword && newPassword === confirmPassword ? '✓' : '○'} Passwords match
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="auth-spinner" />
                Updating Password...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Set New Password
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
