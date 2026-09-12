'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Code, GitPullRequest, GitBranch, CheckCircle2, XCircle,
  Clock, Bot, Sparkles, Terminal, Copy, Check, Play,
  ExternalLink, FileCode, AlertTriangle, ShieldCheck, Zap
} from 'lucide-react';
import { useRecentPipelines } from '@/hooks/useDashboard';

interface PullRequestItem {
  id: string;
  title: string;
  branch: string;
  repo: string;
  prNumber: number;
  status: 'approved' | 'review_required' | 'tests_failing';
  aiScore: number;
  updatedAt: string;
}

interface AIPatch {
  id: string;
  file: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  diffBefore: string;
  diffAfter: string;
}

const MY_PULL_REQUESTS: PullRequestItem[] = [
  {
    id: 'pr-1',
    title: 'feat(auth): integrate multi-tenant organization switching',
    branch: 'feat/multi-tenant-orgs',
    repo: 'aiDevOps/core-api',
    prNumber: 142,
    status: 'approved',
    aiScore: 94,
    updatedAt: '25m ago',
  },
  {
    id: 'pr-2',
    title: 'fix(billing): handle stripe webhook retry idempotency',
    branch: 'fix/stripe-idempotency',
    repo: 'aiDevOps/core-api',
    prNumber: 141,
    status: 'review_required',
    aiScore: 82,
    updatedAt: '2h ago',
  },
  {
    id: 'pr-3',
    title: 'refactor(ui): extract role-specific dashboard views',
    branch: 'refactor/role-ui-views',
    repo: 'aiDevOps/web-dashboard',
    prNumber: 88,
    status: 'approved',
    aiScore: 98,
    updatedAt: '4h ago',
  },
];

const RECENT_AI_PATCHES: AIPatch[] = [
  {
    id: 'patch-1',
    file: 'apps/api/src/modules/auth/auth.service.ts',
    issue: 'Potential timing attack during bcrypt password comparison fallback',
    severity: 'medium',
    diffBefore: `- if (!user) return null;\n- const valid = await bcrypt.compare(pass, user.password);`,
    diffAfter: `+ const hash = user?.password || DUMMY_HASH;\n+ const valid = await bcrypt.compare(pass, hash);\n+ if (!user) return null;`,
  },
  {
    id: 'patch-2',
    file: 'apps/web/src/hooks/useDashboard.ts',
    issue: 'Missing error boundary retry limit in SWR configuration',
    severity: 'low',
    diffBefore: `- const { data } = useSWR(key, fetcher);`,
    diffAfter: `+ const { data } = useSWR(key, fetcher, { shouldRetryOnError: false });`,
  },
];

export default function DeveloperApplication() {
  const { data: session } = useSession();
  const { pipelines } = useRecentPipelines();
  const [copiedToken, setCopiedToken] = useState(false);
  const [activeTab, setActiveTab] = useState<'prs' | 'patches' | 'logs'>('prs');

  const userName = session?.user?.name || 'Developer';

  const handleCopyCliToken = () => {
    navigator.clipboard.writeText('aidevops login --token=agt_usr_live_8f39c2e04a7');
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── Developer Header ─────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.12) 0%, rgba(17, 24, 39, 0.6) 100%)',
          border: '1px solid rgba(167, 139, 250, 0.25)',
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
              background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
              flexShrink: 0,
            }}
          >
            <Code size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Welcome back, {userName}
              </h1>
              <span
                style={{
                  background: 'rgba(167, 139, 250, 0.2)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(167, 139, 250, 0.4)',
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
                <Code size={12} /> Software Engineer
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Personal Workspace: Active Branches, AI Code Reviews, and Pipeline Status
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyCliToken}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Terminal size={14} />
            {copiedToken ? 'CLI Command Copied!' : 'Copy CLI Login'}
          </button>
          <Link
            href="/dashboard/pipelines"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Play size={14} /> Trigger Run
          </Link>
        </div>
      </div>

      {/* ── Developer Stat Cards ───────────────────────────────────────── */}
      <div className="kpi-grid">
        {[
          { label: 'Active Pull Requests', value: '3 Open', delta: '2 Ready to Merge', icon: <GitPullRequest size={16} className="text-purple-400" />, deltaColor: 'var(--accent-green)' },
          { label: 'AI Review Pass Rate', value: '96%', delta: 'Avg Score: 91/100', icon: <Bot size={16} className="text-cyan-400" />, deltaColor: 'var(--accent-cyan)' },
          { label: 'Unit Test Coverage', value: '88.4%', delta: '142 Tests Passing', icon: <CheckCircle2 size={16} className="text-emerald-400" />, deltaColor: 'var(--accent-green)' },
          { label: 'Staging Deployments', value: 'v2.14.0', delta: 'Running on stage-us', icon: <Zap size={16} className="text-amber-400" />, deltaColor: 'var(--text-muted)' },
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

      {/* ── Main Work Section ─────────────────────────────────────────── */}
      <div className="dashboard-grid">
        {/* Left Column (8 cols): My Work Feed & AI Review Findings */}
        <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Work Feed Header Tabs */}
          <div
            className="card"
            style={{
              padding: 'clamp(1rem, 2vw, 1.5rem)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('prs')}
                  className={`btn btn-sm ${activeTab === 'prs' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <GitPullRequest size={14} /> My PRs ({MY_PULL_REQUESTS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('patches')}
                  className={`btn btn-sm ${activeTab === 'patches' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Sparkles size={14} /> AI Patches ({RECENT_AI_PATCHES.length})
                </button>
              </div>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Auto-synced with Git provider
              </span>
            </div>

            {activeTab === 'prs' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {MY_PULL_REQUESTS.map((pr) => (
                  <div
                    key={pr.id}
                    style={{
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {pr.title}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{pr.prNumber}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>{pr.repo}</span>
                        <span>•</span>
                        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent-cyan)' }}>
                          {pr.branch}
                        </code>
                        <span>•</span>
                        <span>Updated {pr.updatedAt}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AI Score</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                          {pr.aiScore}/100
                        </div>
                      </div>
                      <span
                        className={`badge ${pr.status === 'approved' ? 'badge-success' : 'badge-warning'}`}
                        style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                      >
                        {pr.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {RECENT_AI_PATCHES.map((patch) => (
                  <div
                    key={patch.id}
                    style={{
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileCode size={16} className="text-purple-400" />
                          <code style={{ fontSize: '0.825rem', color: 'var(--accent-cyan)' }}>{patch.file}</code>
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0' }}>
                          {patch.issue}
                        </p>
                      </div>
                      <span className={`badge ${patch.severity === 'medium' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                        {patch.severity.toUpperCase()}
                      </span>
                    </div>

                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        lineHeight: 1.5,
                        overflowX: 'auto',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div style={{ color: '#f87171' }}>{patch.diffBefore}</div>
                      <div style={{ color: '#34d399', marginTop: '0.25rem' }}>{patch.diffAfter}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Pipelines Executed */}
          <section className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Recent Build Executions</h3>
              <Link href="/dashboard/pipelines" className="btn btn-secondary btn-sm">
                View All
              </Link>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Repository</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Triggered</th>
                  </tr>
                </thead>
                <tbody>
                  {(pipelines ?? []).slice(0, 3).map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{p.projectId}</td>
                      <td>
                        <code style={{ fontSize: '0.75rem', background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>
                          {p.branch}
                        </code>
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'success' ? 'badge-success' : p.status === 'failed' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.triggeredBy}</td>
                    </tr>
                  ))}
                  {(!pipelines || pipelines.length === 0) && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No recent build executions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column (4 cols): Developer Tooling & IDE Shortcuts */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* CLI & IDE Integration Card */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Terminal size={16} className="text-cyan-400" />
              Dev Environment Sync
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
              Authenticate your local development terminal or VS Code extension to stream real-time AI code reviews directly into your editor.
            </p>

            <div
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: 'var(--accent-cyan)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                aidevops login --token=agt_live...
              </span>
              <button
                type="button"
                onClick={handleCopyCliToken}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                {copiedToken ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.4rem 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>VS Code Extension</span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Connected</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.4rem 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>GitHub Copilot Bridge</span>
                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Ready</span>
              </div>
            </div>
          </div>

          {/* Quick Developer Resources */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem' }}>Developer Links</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'AI Code Review Engine', href: '/dashboard/ai-review', icon: <Bot size={16} className="text-purple-400" /> },
                { label: 'Active Pipelines', href: '/dashboard/pipelines', icon: <GitBranch size={16} className="text-cyan-400" /> },
                { label: 'Deployment Preview', href: '/dashboard/deployments', icon: <Play size={16} className="text-emerald-400" /> },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
