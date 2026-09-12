'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield, Users, GitBranch, CheckCircle2, XCircle, Clock,
  ArrowRight, RefreshCw, AlertTriangle, Play, ChevronRight,
  Database, Server, ExternalLink, Filter, Check, X
} from 'lucide-react';
import { usePipelineStats, useRecentPipelines } from '@/hooks/useDashboard';
import { useOrganizationId } from '@/hooks/useOrganizationId';

interface ApprovalRequest {
  id: string;
  project: string;
  environment: string;
  author: string;
  commitSha: string;
  riskScore: number;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_APPROVAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'apr-101',
    project: 'checkout-service',
    environment: 'production-us-east-1',
    author: 'alex.chen',
    commitSha: '7f9a21b',
    riskScore: 24,
    requestedAt: '12m ago',
    status: 'pending',
  },
  {
    id: 'apr-102',
    project: 'auth-gateway',
    environment: 'production-eu-west-1',
    author: 'sarah.k',
    commitSha: '9c3e44d',
    riskScore: 42,
    requestedAt: '35m ago',
    status: 'pending',
  },
  {
    id: 'apr-103',
    project: 'billing-engine',
    environment: 'staging-cluster',
    author: 'david.m',
    commitSha: '3a18e0f',
    riskScore: 12,
    requestedAt: '1h ago',
    status: 'approved',
  },
];

export default function AdminApplication() {
  const { data: session } = useSession();
  const orgId = useOrganizationId();
  const { stats: pipelineStats } = usePipelineStats();
  const { pipelines } = useRecentPipelines();

  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(INITIAL_APPROVAL_REQUESTS);
  const [syncingWebhooks, setSyncingWebhooks] = useState(false);
  const [webhookSyncedAt, setWebhookSyncedAt] = useState('2 minutes ago');

  const handleApprove = (id: string) => {
    setApprovalRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
    );
  };

  const handleReject = (id: string) => {
    setApprovalRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' } : item))
    );
  };

  const handleSyncWebhooks = () => {
    setSyncingWebhooks(true);
    setTimeout(() => {
      setSyncingWebhooks(false);
      setWebhookSyncedAt('Just now');
    }, 900);
  };

  const pendingApprovalsCount = approvalRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── Admin Operations Header ───────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.12) 0%, rgba(17, 24, 39, 0.6) 100%)',
          border: '1px solid rgba(129, 140, 248, 0.25)',
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
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              flexShrink: 0,
            }}
          >
            <Shield size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Administrative Operations
              </h1>
              <span
                style={{
                  background: 'rgba(129, 140, 248, 0.2)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(129, 140, 248, 0.4)',
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
                <Shield size={12} /> System Admin
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Team Access, Deployment Gatekeeper Approvals, and Repository Webhook Integrity
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/team"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Users size={14} /> Team Management
          </Link>
          <Link
            href="/dashboard/pipelines"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <GitBranch size={14} /> View Pipelines
          </Link>
        </div>
      </div>

      {/* ── Metric Snapshot ───────────────────────────────────────────────── */}
      <div className="kpi-grid">
        {[
          {
            label: 'Pending Deploy Approvals',
            value: pendingApprovalsCount.toString(),
            delta: pendingApprovalsCount > 0 ? 'Requires Attention' : 'Queue Empty',
            icon: <Clock size={16} className={pendingApprovalsCount > 0 ? 'text-amber-400' : 'text-emerald-400'} />,
            deltaColor: pendingApprovalsCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)',
          },
          {
            label: 'Enforced Security Policies',
            value: '24',
            delta: '100% Passing Gate',
            icon: <Shield size={16} className="text-indigo-400" />,
            deltaColor: 'var(--accent-green)',
          },
          {
            label: 'Synced Repositories',
            value: '18',
            delta: 'Webhooks Active',
            icon: <GitBranch size={16} className="text-cyan-400" />,
            deltaColor: 'var(--accent-cyan)',
          },
          {
            label: 'Team Members',
            value: '14 Active',
            delta: '0 Pending Password Resets',
            icon: <Users size={16} className="text-purple-400" />,
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
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
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

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="dashboard-grid">
        {/* Left Column (8 cols): Deployment Gatekeeper & Webhook Status */}
        <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Deployment Gatekeeper Queue */}
          <section className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} className="text-indigo-400" />
                  Deployment Gatekeeper Queue
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  High-risk and production releases require explicit administrative sign-off before execution.
                </p>
              </div>
              <span className={`badge ${pendingApprovalsCount > 0 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                {pendingApprovalsCount} Action{pendingApprovalsCount === 1 ? '' : 's'} Required
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {approvalRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {req.project}
                      </span>
                      <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>
                        {req.environment}
                      </code>
                      <code style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                        sha:{req.commitSha}
                      </code>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Triggered by <span style={{ color: 'var(--text-secondary)' }}>{req.author}</span> • {req.requestedAt}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Risk Score</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: req.riskScore > 35 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                        {req.riskScore}/100
                      </div>
                    </div>

                    {req.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => handleApprove(req.id)}
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontWeight: 600,
                          }}
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(req.id)}
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontWeight: 600,
                          }}
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`badge ${req.status === 'approved' ? 'badge-success' : 'badge-danger'}`}
                        style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}
                      >
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Repository Connections & Webhook Synchronization */}
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
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GitBranch size={18} className="text-cyan-400" />
                  Repository Webhooks & Event Ingestion
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  Last health synchronization: {webhookSyncedAt}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncWebhooks}
                disabled={syncingWebhooks}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <RefreshCw size={14} className={syncingWebhooks ? 'animate-spin' : ''} />
                Sync Webhooks
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { repo: 'aiDevOps/core-api', provider: 'GitHub Enterprise', status: 'Healthy', events: '1.2k events/hr' },
                { repo: 'aiDevOps/web-dashboard', provider: 'GitHub Enterprise', status: 'Healthy', events: '480 events/hr' },
                { repo: 'aiDevOps/infra-helm', provider: 'GitLab Cloud', status: 'Healthy', events: '120 events/hr' },
              ].map((item) => (
                <div
                  key={item.repo}
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>{item.repo}</span>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{item.status}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{item.provider}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Throughput: {item.events}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column (4 cols): Policy Enforcement & Admin Actions */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Policy Enforcement Metrics */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={16} className="text-purple-400" />
              Policy Enforcement Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { name: 'Mandatory AI Review Scan', metric: '100% Enforced', pass: true },
                { name: 'Security Vulnerability Gate', metric: '0 Tolerated', pass: true },
                { name: 'Dual Admin Approvals (Prod)', metric: 'Active', pass: true },
                { name: 'Automated Rollback on Error', metric: 'Enabled', pass: true },
              ].map((pol) => (
                <div
                  key={pol.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.55rem 0.75rem',
                    background: 'var(--bg-surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{pol.name}</span>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.75rem' }}>
                    {pol.metric}
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
                Configure All Policies
              </Link>
            </div>
          </div>

          {/* Quick Admin Actions */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem' }}>Admin Shortcuts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Team Directory', desc: 'Active members & role assignments', href: '/dashboard/team', icon: <Users size={16} className="text-indigo-400" /> },
                { label: 'Active Pipelines', desc: 'Monitor CI/CD runs across all repos', href: '/dashboard/pipelines', icon: <GitBranch size={16} className="text-cyan-400" /> },
                { label: 'Deployments', desc: 'Environment rollouts & strategies', href: '/dashboard/deployments', icon: <Play size={16} className="text-emerald-400" /> },
                { label: 'Audit Logs', desc: 'Trace administrative activity', href: '/dashboard/settings', icon: <Clock size={16} className="text-amber-400" /> },
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
                  }}
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
