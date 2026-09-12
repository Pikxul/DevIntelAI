'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Users, UserPlus, Settings, ShieldCheck, Gauge,
  Activity, TrendingUp, CreditCard, Server, ArrowRight,
  CheckCircle2, XCircle, Copy, RefreshCw, AlertCircle,
  ExternalLink, Building2, ChevronRight, Lock
} from 'lucide-react';
import { usePipelineStats, useAIReviewStats, useRecentPipelines } from '@/hooks/useDashboard';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { ROLE_LABELS } from '@/lib/permissions';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const ASSIGNABLE_ROLES = [
  'admin',
  'devops_engineer',
  'sre_engineer',
  'security_engineer',
  'developer',
  'analyst',
  'viewer',
];

export default function OwnerApplication() {
  const { data: session } = useSession();
  const orgId = useOrganizationId();
  const token = (session as any)?.accessToken;
  const userOrgName = (session as any)?.organizationName || 'Enterprise Cloud';

  const { stats: pipelineStats, isLoading: pipelineLoading } = usePipelineStats();
  const { stats: aiStats } = useAIReviewStats();
  const { pipelines } = useRecentPipelines();

  // Quick Provisioning State
  const [provisionName, setProvisionName] = useState('');
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionRole, setProvisionRole] = useState('developer');
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleQuickProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    setProvisionSuccess(null);
    setProvisionLoading(true);

    try {
      if (!orgId) {
        throw new Error('No active organization detected. Please reload.');
      }
      const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: provisionName,
          email: provisionEmail.toLowerCase().trim(),
          role: provisionRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to provision member');
      }

      const data = await res.json();
      setProvisionSuccess({
        email: data.member?.email || provisionEmail,
        temporaryPassword: data.temporaryPassword,
      });
      setProvisionName('');
      setProvisionEmail('');
    } catch (err: any) {
      setProvisionError(err.message || 'Failed to create member');
    } finally {
      setProvisionLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!provisionSuccess) return;
    navigator.clipboard.writeText(
      `DevIntel Credentials:\nEmail: ${provisionSuccess.email}\nTemporary Password: ${provisionSuccess.temporaryPassword}\nLogin at: ${window.location.origin}/auth/login`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── Executive Header ────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(17, 24, 39, 0.6) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(1.25rem, 2.5vw, 1.75rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              flexShrink: 0,
            }}
          >
            <Crown size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {userOrgName}
              </h1>
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
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
                <Crown size={12} /> Executive Owner
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                Enterprise Tier
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Organization Command, Strategic Engineering Telemetry, and Team Governance
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/team"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Users size={14} /> Full Team Hub
          </Link>
          <Link
            href="/dashboard/settings"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Settings size={14} /> Org Settings
          </Link>
        </div>
      </div>

      {/* ── Executive KPI Row ────────────────────────────────────────── */}
      <div className="kpi-grid">
        {[
          {
            label: 'System Uptime',
            value: '99.98%',
            delta: 'SLA Compliant',
            icon: <Activity size={16} className="text-emerald-500" />,
            deltaColor: 'var(--accent-green)',
          },
          {
            label: 'Pipeline Success',
            value: pipelineStats ? `${pipelineStats.successRate}%` : '99.4%',
            delta: `${pipelineStats?.total ?? 38} Total Executions`,
            icon: <TrendingUp size={16} className="text-cyan-400" />,
            deltaColor: 'var(--accent-cyan)',
          },
          {
            label: 'Compliance Score',
            value: '100%',
            delta: 'SOC2 & HIPAA Verified',
            icon: <ShieldCheck size={16} className="text-blue-500" />,
            deltaColor: 'var(--accent-green)',
          },
          {
            label: 'Estimated Mo. Spend',
            value: '$3,420',
            delta: '74% of $5k Budget',
            icon: <CreditCard size={16} className="text-amber-500" />,
            deltaColor: 'var(--text-muted)',
          },
        ].map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              padding: 'clamp(1rem, 2vw, 1.25rem)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-muted)',
                fontSize: '0.72rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {kpi.icon} {kpi.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)', fontWeight: 800 }}>{kpi.value}</span>
              <span style={{ fontSize: '0.75rem', color: kpi.deltaColor, fontWeight: 600 }}>{kpi.delta}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Main Two-Column Organization Layout ────────────────────────── */}
      <div className="dashboard-grid">
        {/* Left Column (8 cols): Quick Provisioning & Health Overview */}
        <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Team Provisioning Widget */}
          <section
            className="card"
            style={{
              padding: 'clamp(1.25rem, 2vw, 1.75rem)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              background: 'radial-gradient(ellipse at top left, rgba(129,140,248,0.06) 0%, var(--bg-surface) 70%)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={18} className="text-indigo-400" />
                  Quick Team Member Provisioning
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  Creates active member record with an auto-generated temporary password and forced first-login rotation.
                </p>
              </div>
              <Link href="/dashboard/team" style={{ fontSize: '0.8rem', color: 'var(--accent-purple-light)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                All Members <ChevronRight size={14} />
              </Link>
            </div>

            {provisionError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fca5a5',
                  fontSize: '0.825rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <XCircle size={16} /> {provisionError}
              </div>
            )}

            {provisionSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <CheckCircle2 size={20} /> Member Successfully Provisioned!
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Provide these initial credentials to the team member. They will be required to change this password upon initial authentication:
                </p>
                <div
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Email: </span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{provisionSuccess.email}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Temporary Password: </span>
                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>{provisionSuccess.temporaryPassword}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Copy size={14} /> {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvisionSuccess(null)}
                    className="btn btn-primary btn-sm"
                  >
                    Provision Another
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleQuickProvision} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maya Lin"
                    value={provisionName}
                    onChange={(e) => setProvisionName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="maya@company.com"
                    value={provisionEmail}
                    onChange={(e) => setProvisionEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Assigned Role
                  </label>
                  <select
                    value={provisionRole}
                    onChange={(e) => setProvisionRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r} style={{ background: '#111827' }}>
                        {ROLE_LABELS[r] || r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={provisionLoading}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.6rem 1rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    {provisionLoading ? (
                      <><RefreshCw size={14} className="animate-spin" /> Provisioning...</>
                    ) : (
                      <><UserPlus size={14} /> Provision Member</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Organization Infrastructure Health & Allocation */}
          <section className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server size={18} className="text-cyan-400" />
                Cluster & Tenant Capacity Allocation
              </h3>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                All Clusters Optimal
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { title: 'Team Seats', used: 14, total: 25, unit: 'seats', pct: 56, color: '#818cf8' },
                { title: 'Active Repositories', used: 18, total: 50, unit: 'repos', pct: 36, color: '#38bdf8' },
                { title: 'Connected Clusters', used: 3, total: 5, unit: 'clusters', pct: 60, color: '#34d399' },
                { title: 'Monthly AI Tokens', used: 2.1, total: 5.0, unit: 'M tokens', pct: 42, color: '#a78bfa' },
              ].map((res) => (
                <div
                  key={res.title}
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <span>{res.title}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{res.used} / {res.total} {res.unit}</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${res.pct}%`,
                        height: '100%',
                        background: res.color,
                        borderRadius: 9999,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {res.pct}% utilized
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Executive Pipeline Oversight */}
          <section className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Executive Pipeline Stream</h3>
              <Link href="/dashboard/pipelines" className="btn btn-secondary btn-sm">
                Full Telemetry
              </Link>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Branch</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(pipelines ?? []).slice(0, 4).map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{p.projectId}</td>
                      <td>
                        <code style={{ fontSize: '0.75rem', background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>
                          {p.branch}
                        </code>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{p.author}</td>
                      <td>
                        <span className={`badge ${p.status === 'success' ? 'badge-success' : p.status === 'failed' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(!pipelines || pipelines.length === 0) && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No pipelines executed recently.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column (4 cols): Enterprise Security, Compliance, & Quick Ops */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Security & Compliance Card */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} className="text-emerald-400" />
                Enterprise Security & Audit
              </h3>
              <span className="badge badge-success" style={{ fontSize: '0.625rem' }}>
                AUDIT READY
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { name: 'SOC2 Type II Controls', status: 'Compliant (100%)', badge: 'badge-success' },
                { name: 'HIPAA Security Rule', status: 'Active Enforced', badge: 'badge-success' },
                { name: 'Two-Factor (2FA) Mandate', status: 'Enforced All Users', badge: 'badge-success' },
                { name: 'Zero-Trust Role Gating', status: 'Active (RBAC)', badge: 'badge-info' },
                { name: 'Audit Log Immutability', status: 'PostgreSQL Signed', badge: 'badge-info' },
              ].map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                  <span className={`badge ${item.badge}`} style={{ fontSize: '0.65rem' }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <Link
                href="/dashboard/governance"
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Lock size={14} /> Open Governance Policies
              </Link>
            </div>
          </div>

          {/* Executive Quick Links */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem' }}>Executive Controls</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Manage Team & Roles', desc: 'Invite, deactivate, role adjustments', href: '/dashboard/team', icon: <Users size={16} className="text-indigo-400" /> },
                { label: 'DORA Benchmarks', desc: 'High-level velocity and stability', href: '/dashboard/analytics', icon: <Gauge size={16} className="text-amber-400" /> },
                { label: 'AI Review Optimization', desc: 'Provider tokens & cost analytics', href: '/dashboard/ai-review', icon: <CreditCard size={16} className="text-purple-400" /> },
                { label: 'Organization Settings', desc: 'Single sign-on, billing, domain', href: '/dashboard/settings', icon: <Settings size={16} className="text-cyan-400" /> },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  className="hover:border-indigo-500"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {action.icon}
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>{action.label}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{action.desc}</div>
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
