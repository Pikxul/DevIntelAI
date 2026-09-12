'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Mail, LogOut, HelpCircle,
  ArrowLeft, RefreshCw, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface RoleFallbackProps {
  role?: string | null;
}

export default function RoleFallbackApplication({ role }: RoleFallbackProps) {
  const displayRole = role || 'Unknown';

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        padding: '1.5rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: 540,
          width: '100%',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(1.5rem, 4vw, 2.5rem)',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#f87171',
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Role Configuration Unavailable
        </h1>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Your account is currently assigned the role{' '}
          <code
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '2px 8px',
              borderRadius: 4,
              color: '#fca5a5',
              fontWeight: 700,
            }}
          >
            {displayRole}
          </code>
          , which does not have a dedicated application dashboard view configured.
        </p>

        <div
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            textAlign: 'left',
            fontSize: '0.825rem',
            color: 'var(--text-muted)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
          }}
        >
          <AlertCircle size={18} className="text-amber-400" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            Please contact your organization Owner or Administrator to assign you an active operational role (such as{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Developer</strong>,{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Admin</strong>, or{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Analyst</strong>).
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <a
            href="mailto:admin@company.com?subject=DevIntel%20Role%20Assignment%20Request"
            className="btn btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.65rem',
            }}
          >
            <Mail size={16} /> Contact Organization Admin
          </a>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-secondary btn-sm"
              style={{
                flex: 1,
                justifyContent: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <RefreshCw size={14} /> Refresh Session
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="btn btn-secondary btn-sm"
              style={{
                flex: 1,
                justifyContent: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#fca5a5',
              }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
