'use client';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { getDeployments, rollbackDeployment, Deployment } from '@/lib/api';
import {
  Rocket,
  RefreshCw,
  Layers,
  GitMerge,
  Settings,
  Loader2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

const envColor: Record<string, string> = {
  production: 'badge-danger',
  staging: 'badge-warning',
  development: 'badge-info',
};
const statusColor: Record<string, string> = {
  success: 'badge-success',
  failed: 'badge-danger',
  running: 'badge-info',
  pending: 'badge-neutral',
  rolled_back: 'badge-warning',
};
const strategyIcon: Record<string, React.ReactNode> = {
  rolling: <RefreshCw size={12} style={{ marginRight: '0.25rem' }} />,
  blue_green: <Layers size={12} style={{ marginRight: '0.25rem', color: 'var(--accent-blue, #3b82f6)' }} />,
  canary: <GitMerge size={12} style={{ marginRight: '0.25rem', color: 'var(--accent-yellow, #eab308)' }} />,
};

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDuration(started: string, completed?: string): string {
  if (!completed) return '—';
  const ms = new Date(completed).getTime() - new Date(started).getTime();
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDeployments = useCallback(async () => {
    try {
      const data = await getDeployments(50);
      setDeployments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 15000);
    return () => clearInterval(interval);
  }, [fetchDeployments]);

  const handleRollback = async (id: string) => {
    if (!confirm('Are you sure you want to rollback this deployment?')) return;
    setRollingBack(id);
    try {
      await rollbackDeployment(id, 'Manual rollback from dashboard');
      await fetchDeployments();
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    } finally {
      setRollingBack(null);
    }
  };

  // Stats derived from real data
  const stats = {
    rolling: deployments.filter(d => d.strategy === 'rolling').length,
    blue_green: deployments.filter(d => d.strategy === 'blue_green').length,
    canary: deployments.filter(d => d.strategy === 'canary').length,
    total: deployments.length,
    success: deployments.filter(d => d.status === 'success').length,
    failed: deployments.filter(d => d.status === 'failed').length,
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Rocket size={24} className="text-primary" />
            <span>Deployments</span>
          </h1>
          <p className="page-subtitle">Deployment history, canary controls & rollback</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-success">{stats.total} deployments total</span>
          <span className="badge badge-neutral">{stats.success} succeeded · {stats.failed} failed</span>
        </div>
      </div>

      {/* Strategy breakdown */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
        {[
          { label: 'Rolling Updates', value: stats.rolling, icon: <RefreshCw size={18} className="text-cyan-400" />, desc: 'Zero downtime' },
          { label: 'Blue/Green', value: stats.blue_green, icon: <Layers size={18} className="text-blue-400" />, desc: 'Instant switch' },
          { label: 'Canary', value: stats.canary, icon: <GitMerge size={18} className="text-yellow-400" />, desc: 'Gradual traffic shift' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">{s.label}</span>
              <span>{s.icon}</span>
            </div>
            <div className="stat-value">{isLoading ? '—' : s.value}</div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>{s.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Deployments Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
          <h3>Deployment History</h3>
          <button
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            onClick={fetchDeployments}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted text-sm flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-muted" size={16} />
            <span>Loading deployments…</span>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-red)' }}>
            <div className="flex justify-center" style={{ marginBottom: '0.5rem' }}>
              <AlertTriangle size={32} />
            </div>
            <p>API Error: {error}</p>
            <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>Make sure the API server is running at {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}</p>
          </div>
        ) : deployments.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div className="flex justify-center" style={{ marginBottom: '1rem' }}>
              <Rocket size={40} className="text-muted" style={{ opacity: 0.5 }} />
            </div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No deployments yet</p>
            <p className="text-muted text-sm">Deployments will appear here after a pipeline run completes.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Project / Pipeline</th>
                  <th>Environment</th>
                  <th>Strategy</th>
                  <th>Image Tag</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((d, i) => {
                  const env = (d.target as any)?.environment ?? 'unknown';
                  return (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                          {d.pipelineRunId.slice(0, 8)}…
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${envColor[env] ?? 'badge-neutral'}`}>{env}</span>
                      </td>
                      <td>
                        <span className="badge badge-neutral flex items-center">
                          {strategyIcon[d.strategy] ?? <Settings size={12} style={{ marginRight: '0.25rem' }} />}
                          <span>{d.strategy.replace('_', '/')}</span>
                        </span>
                      </td>
                      <td>
                        <code className="font-mono text-xs" style={{ color: 'var(--accent-cyan)' }}>
                          {d.imageTag}
                        </code>
                      </td>
                      <td>
                        <span className={`badge ${statusColor[d.status] ?? 'badge-neutral'}`}>
                          {d.status}
                        </span>
                        {d.canaryWeight && (
                          <span className="text-xs text-muted" style={{ marginLeft: 6 }}>
                            {d.canaryWeight}%
                          </span>
                        )}
                      </td>
                      <td className="text-secondary text-sm">
                        {formatDuration(d.startedAt, d.completedAt)}
                      </td>
                      <td className="text-muted text-xs">{formatTime(d.startedAt)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {d.status === 'success' && d.previousImageTag && (
                            <button
                              className="btn btn-sm flex items-center gap-1"
                              style={{
                                background: 'rgba(239,68,68,0.1)',
                                color: 'var(--accent-red)',
                                border: '1px solid rgba(239,68,68,0.2)',
                              }}
                              onClick={() => handleRollback(d.id)}
                              disabled={rollingBack === d.id}
                            >
                              {rollingBack === d.id ? <Loader2 className="animate-spin" size={12} /> : <RotateCcw size={12} />}
                              <span>Rollback</span>
                            </button>
                          )}
                          {d.rollbackReason && (
                            <span
                              className="text-xs text-muted flex items-center gap-1"
                              title={d.rollbackReason}
                              style={{ cursor: 'help' }}
                            >
                              <AlertTriangle size={12} className="text-warning" style={{ color: 'var(--accent-yellow, #fbbf24)' }} />
                              <span>rolled back</span>
                            </span>
                          )}
                        </div>
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
