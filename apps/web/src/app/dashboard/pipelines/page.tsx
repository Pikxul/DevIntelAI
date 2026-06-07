'use client';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPipelines, getPipelineStats, triggerPipeline, getProjects, PipelineRun, PipelineStats, Project } from '@/lib/api';
import { GitBranch, RefreshCw, Play, Sparkles, CheckCircle2, XCircle, Clock, BarChart3, ArrowUpCircle, GitPullRequest, AlertTriangle } from 'lucide-react';

const DEFAULT_ORG = 'default-org';

const STAGES = ['code_push', 'ai_review', 'security_scan', 'unit_tests', 'containerize', 'deploy', 'notify'];
const STAGE_LABELS: Record<string, string> = {
  code_push: 'Push', ai_review: 'AI Review', security_scan: 'Security',
  unit_tests: 'Tests', containerize: 'Docker', deploy: 'Deploy', notify: 'Monitor',
};

const statusBadge: Record<string, string> = {
  success: 'badge-success', failed: 'badge-danger',
  running: 'badge-info', blocked: 'badge-warning', pending: 'badge-neutral',
};
const stageColor: Record<string, string> = {
  success: 'var(--accent-green)', failed: 'var(--accent-red)',
  running: 'var(--accent-blue)', pending: '#334155', skipped: '#334155', blocked: 'var(--accent-orange)',
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function getDuration(run: PipelineRun): string {
  if (!run.completedAt) return '—';
  const ms = new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function PipelinesPage() {
  const router = useRouter();
  const [pipelines, setPipelines] = useState<PipelineRun[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | PipelineRun['status']>('all');
  const [showTrigger, setShowTrigger] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerForm, setTriggerForm] = useState({
    branch: 'main',
    message: 'feat: manual pipeline trigger',
    projectId: '',
    organizationId: 'default-org',
  });

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerForm.projectId) {
      alert('Please select or provide a valid project.');
      return;
    }
    setTriggering(true);
    try {
      const run = await triggerPipeline(triggerForm);
      setShowTrigger(false);
      router.push(`/dashboard/pipelines/${run.id}`);
    } catch (err: any) {
      alert(`Failed to trigger pipeline: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [runs, pStats, projs] = await Promise.all([
        getPipelines(DEFAULT_ORG),
        getPipelineStats(DEFAULT_ORG),
        getProjects(DEFAULT_ORG),
      ]);
      setPipelines(runs);
      setStats(pStats);
      setProjects(projs);
      if (projs.length > 0) {
        setTriggerForm(prev => ({
          ...prev,
          projectId: projs[0].id,
        }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = filter === 'all' ? pipelines : pipelines.filter(p => p.status === filter);
  const runningCount = pipelines.filter(p => p.status === 'running').length;

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitBranch size={24} className="text-purple-400" /> Pipeline Runs
          </h1>
          <p className="page-subtitle">Full CI/CD pipeline history with AI-powered code review stages</p>
        </div>
        <div className="flex items-center gap-3">
          {runningCount > 0 && (
            <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <RefreshCw size={12} className="animate-spin" /> {runningCount} running
            </span>
          )}
          <button className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }} onClick={fetchData}>
            <RefreshCw size={12} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }} onClick={() => setShowTrigger(true)}>
            <Play size={12} className="fill-white" /> Trigger Pipeline
          </button>
        </div>
      </div>

      {/* Trigger Modal */}
      {showTrigger && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1.5rem',
          }}
          onClick={e => e.target === e.currentTarget && setShowTrigger(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '2rem',
              width: '100%', maxWidth: 480, margin: 'auto',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Play size={18} className="fill-purple-400 text-purple-400" /> Trigger Pipeline Run
              </h3>
              <button onClick={() => setShowTrigger(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem' }}>✕</button>
            </div>
            <form onSubmit={handleTrigger} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Project</label>
                {projects.length > 0 ? (
                  <select
                    value={triggerForm.projectId}
                    onChange={e => setTriggerForm(prev => ({ ...prev, projectId: e.target.value }))}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)', padding: '0.6rem 0.875rem', fontSize: '0.875rem',
                    }}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.repoProvider})</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '0.875rem', color: 'var(--accent-red)' }}>
                    No connected projects found in this organization. Please connect a project first.
                  </div>
                )}
              </div>

              {[
                { label: 'Branch', key: 'branch', placeholder: 'main' },
                { label: 'Commit Message', key: 'message', placeholder: 'feat: new feature' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>{f.label}</label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={(triggerForm as any)[f.key]}
                    onChange={e => setTriggerForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)', padding: '0.6rem 0.875rem', fontSize: '0.875rem',
                    }}
                  />
                </div>
              ))}
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.375rem' }}>
                <Sparkles size={14} className="text-purple-400" style={{ flexShrink: 0 }} />
                <span>This will trigger a live pipeline run through the AI Review, Policy Engine, and all CI/CD stages. You'll be redirected to watch it progress in real-time.</span>
              </p>
              <button type="submit" className="btn btn-primary" disabled={triggering || projects.length === 0} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {triggering ? (
                  <><Clock size={16} className="animate-spin" /> Triggering...</>
                ) : (
                  <><Play size={16} className="fill-white" /> Run Pipeline</>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '2rem' }}>
        {[
          { label: 'Total Runs', value: stats?.total, icon: <GitBranch size={18} className="text-purple-400" />, color: 'var(--accent-purple-light)' },
          { label: 'Success', value: stats?.succeeded, icon: <CheckCircle2 size={18} className="text-emerald-500" />, color: 'var(--accent-green)' },
          { label: 'Failed', value: stats?.failed, icon: <XCircle size={18} className="text-red-500" />, color: 'var(--accent-red)' },
          { label: 'Running', value: stats?.running, icon: <Clock size={18} className="text-blue-500 animate-spin" />, color: 'var(--accent-blue)' },
          { label: 'Success Rate', value: stats ? `${stats.successRate}%` : undefined, icon: <BarChart3 size={18} className="text-cyan-500" />, color: 'var(--accent-cyan)' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">{s.label}</span>
              {s.icon}
            </div>
            <div className="stat-value" style={{ color: s.color }}>
              {isLoading ? '—' : (s.value ?? '0')}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2" style={{ marginBottom: '1rem' }}>
        {(['all', 'success', 'running', 'failed', 'blocked'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && pipelines.filter(p => p.status === f).length > 0 && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                ({pipelines.filter(p => p.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pipelines Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted text-sm">Loading pipeline runs…</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-red)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
              <p>{error}</p>
            </div>
            <p className="text-xs text-muted" style={{ marginTop: 8 }}>Make sure the API server is running.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <GitBranch size={40} className="text-muted" />
            </div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              {filter === 'all' ? 'No pipeline runs yet' : `No ${filter} pipelines`}
            </p>
            <p className="text-muted text-sm">
              {filter === 'all'
                ? 'Push a commit to a connected repo to trigger your first pipeline.'
                : 'Change filter to see other pipelines.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Branch</th>
                  <th>Commit</th>
                  <th>Author</th>
                  <th>Trigger</th>
                  <th>Pipeline Stages</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const riskScore = (p as any).riskScore ?? null;
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <td><span style={{ fontWeight: 600 }}>{p.projectId}</span></td>
                      <td>
                        <code className="font-mono text-xs" style={{ color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                          {p.branch}
                        </code>
                      </td>
                      <td>
                        <code className="font-mono text-xs text-muted">{p.commitSha.slice(0, 8)}</code>
                      </td>
                      <td className="text-xs text-secondary">{p.author.split('@')[0]}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {p.triggeredBy === 'push' ? (
                            <ArrowUpCircle size={12} />
                          ) : p.triggeredBy === 'pull_request' ? (
                            <GitPullRequest size={12} />
                          ) : (
                            <Play size={12} className="fill-current" />
                          )} {p.triggeredBy}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {(p.stages.length > 0 ? p.stages : STAGES.map(s => ({ name: s, status: 'pending' }))).map((s, si) => (
                            <div
                              key={s.name ?? si}
                              title={`${STAGE_LABELS[s.name] ?? s.name}: ${s.status}`}
                              style={{
                                width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                                background: stageColor[s.status] ?? '#334155',
                                animation: s.status === 'running' ? 'pulse 2s infinite' : undefined,
                              }}
                            />
                          ))}
                        </div>
                      </td>
                      <td>
                        {riskScore !== null
                          ? <span style={{ fontWeight: 700, fontFamily: 'monospace', color: riskScore >= 70 ? 'var(--accent-red)' : riskScore >= 40 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>{riskScore}</span>
                          : <span className="text-muted text-xs">—</span>}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge[p.status] ?? 'badge-neutral'}`}>{p.status}</span>
                      </td>
                      <td className="font-mono text-xs text-secondary">{getDuration(p)}</td>
                      <td className="text-muted text-xs">{timeAgo(p.createdAt)}</td>
                      <td>
                        <Link href={`/dashboard/pipelines/${p.id}`} className="btn btn-secondary btn-sm">
                          Details →
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
