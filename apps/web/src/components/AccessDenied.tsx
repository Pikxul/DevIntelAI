'use client';
import { motion } from 'framer-motion';
import { ShieldX, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';

interface AccessDeniedProps {
  /** Short message explaining what's restricted */
  message?: string;
  /** The permission(s) that were required */
  requiredPermission?: string;
}

/**
 * Full-page "Access Denied" card.
 * Shown when a user navigates to a page they don't have permission for.
 * Matches the dark DevIntel AI theme.
 */
export default function AccessDenied({
  message = 'You don\'t have permission to access this page.',
  requiredPermission,
}: AccessDeniedProps) {
  const { roleLabel } = usePermissions();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          padding: '3rem 2.5rem',
          background: 'var(--bg-surface)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 0 60px rgba(239, 68, 68, 0.05)',
        }}
      >
        {/* Glowing icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <ShieldX size={32} style={{ color: 'var(--accent-red)' }} />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Access Denied
        </h2>

        <p className="text-muted" style={{ fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          {message}
        </p>

        {/* Role info chip */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Your role:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{roleLabel}</span>
          {requiredPermission && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                Requires: {requiredPermission}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          <p className="text-muted" style={{ fontSize: '0.8125rem' }}>
            Contact your Organization Owner or Admin for access.
          </p>

          <Link
            href="/dashboard"
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              marginTop: '0.5rem',
            }}
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
