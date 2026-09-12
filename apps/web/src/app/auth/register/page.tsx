'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Lock, ArrowLeft, AlertCircle, Loader2, Eye, EyeOff, CheckCircle2, Zap } from 'lucide-react';
import { useState, useCallback, useRef, type FormEvent } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgName.trim() || !ownerName.trim() || !email.trim() || !password) {
      setError('All fields are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register-organization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName.trim(),
          ownerName: ownerName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Registration failed');
      }

      const data = await res.json();

      // Store the backend JWT for direct API access
      if (data.token) {
        localStorage.setItem('devintel_token', data.token);
        localStorage.setItem('devintel_user', JSON.stringify(data.user));
      }

      setSuccess(true);

      // Redirect to sign-in so they can authenticate through NextAuth
      setTimeout(() => {
        router.push('/auth/signin?registered=true');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [orgName, ownerName, email, password, confirmPassword, router]);

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
              Organization Created!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
              Redirecting you to sign in...
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
        style={{ maxWidth: '440px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Zap size={28} style={{ color: '#818cf8' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>DevIntel</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            Register Your Organization
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Set up your team workspace in seconds
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
          {/* Organization Name */}
          <div className="auth-field">
            <label className="auth-label">
              <Building2 size={14} style={{ opacity: 0.5 }} />
              Organization Name
            </label>
            <input
              className="auth-input"
              type="text"
              placeholder="Acme Inc."
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          {/* Owner Name */}
          <div className="auth-field">
            <label className="auth-label">
              <User size={14} style={{ opacity: 0.5 }} />
              Your Name
            </label>
            <input
              className="auth-input"
              type="text"
              placeholder="John Doe"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Email */}
          <div className="auth-field">
            <label className="auth-label">
              <Mail size={14} style={{ opacity: 0.5 }} />
              Email Address
            </label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label">
              <Lock size={14} style={{ opacity: 0.5 }} />
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="auth-field">
            <label className="auth-label">
              <Lock size={14} style={{ opacity: 0.5 }} />
              Confirm Password
            </label>
            <input
              className="auth-input"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
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
                Creating Organization...
              </>
            ) : (
              <>
                <Building2 size={18} />
                Create Organization
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            Already have an account?{' '}
            <Link href="/auth/signin" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
