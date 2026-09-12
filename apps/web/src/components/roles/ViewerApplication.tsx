'use client';

import React from 'react';
import Link from 'next/link';
import { Eye, Activity, Gauge, TrendingUp, CheckCircle2, Shield } from 'lucide-react';
import { usePipelineStats } from '@/hooks/useDashboard';

export default function ViewerApplication() {
  const { stats: pipelineStats } = usePipelineStats();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Viewer Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.12) 0%, rgba(17, 24, 39, 0.6) 100%)',
          border: '1px solid rgba(100, 116, 139, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(1.25rem, 2.5vw, 1.75rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #64748b, #475569)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <Eye size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                System Observer Dashboard
              </h1>
              <span
                style={{
                  background: 'rgba(100, 116, 139, 0.2)',
                  color: '#94a3b8',
                  border: '1px solid rgba(100, 116, 139, 0.4)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Eye size={12} /> Read-Only Observer
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Read-only telemetry streaming, high-level DORA KPIs, and service availability
            </p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        {[
          { label: 'System Uptime', value: '99.98%', icon: <Activity size={16} className="text-emerald-500" /> },
          { label: 'Pipeline Success', value: pipelineStats ? `${pipelineStats.successRate}%` : '99.4%', icon: <TrendingUp size={16} className="text-cyan-400" /> },
          { label: 'DORA Velocity', value: 'Elite', icon: <Gauge size={16} className="text-amber-400" /> },
          { label: 'Security Rating', value: 'A+', icon: <Shield size={16} className="text-blue-500" /> },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              padding: 'clamp(1rem, 2vw, 1.25rem)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {kpi.icon} {kpi.label}
              </span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Observer Information Notice */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border)',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
          Observer Access Level
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          Your account is configured with Viewer permissions. You have read-only visibility into operational metrics,
          telemetry charts, and system status. Pipeline executions, deployments, and administrative management functions
          are protected and require an elevated role. Contact your organization administrator if you require active permissions.
        </p>
      </div>
    </div>
  );
}
