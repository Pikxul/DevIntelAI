'use client';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { getDoraMetrics, getPipelineStats, getAIReviewStats, getProjects, getToken, DoraMetrics, Project } from '@/lib/api';
import {
  BarChart3,
  AlertTriangle,
  AlertCircle,
  Rocket,
  Clock,
  Activity,
  Trophy,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  RefreshCw,
  Bot,
  Download
} from 'lucide-react';

const DEFAULT_ORG = 'default-org';

const doraLevelColor: Record<string, string> = {
  Elite: 'var(--accent-green)',
  High: 'var(--accent-blue)',
  Medium: 'var(--accent-yellow)',
  Low: 'var(--accent-red)',
};

const CHART_TOOLTIP_STYLE = {
  background: '#111318',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#f1f5f9',
};

type Days = 7 | 14 | 30;

export default function AnalyticsPage() {
  const [dora, setDora] = useState<DoraMetrics | null>(null);
  const [pipelineStats, setPipelineStats] = useState<{ total: number; succeeded: number; failed: number; successRate: number } | null>(null);
  const [aiStats, setAiStats] = useState<{ total: number; approved: number; blocked: number; avgRiskScore: number; totalCostUsd: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(''); // empty means 'All Repositories'
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState<Days>(30);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch projects list for the dropdown filter (T6.3)
  useEffect(() => {
    getProjects(DEFAULT_ORG)
      .then(setProjects)
      .catch(e => console.error('Failed to fetch projects:', e));
  }, []);

  const fetchData = useCallback(() => {
    Promise.allSettled([
      getDoraMetrics(DEFAULT_ORG, days, selectedProject || undefined),
      getPipelineStats(DEFAULT_ORG),
      getAIReviewStats(),
    ]).then(([doraRes, pipelineRes, aiRes]) => {
      if (doraRes.status === 'fulfilled') {
        setDora(doraRes.value);
        setErrorOccurred(false);
      } else {
        setDora(null);
        setErrorOccurred(true);
      }
      if (pipelineRes.status === 'fulfilled') setPipelineStats(pipelineRes.value);
      if (aiRes.status === 'fulfilled') setAiStats(aiRes.value);
      setIsLoading(false);
    });
  }, [days, selectedProject]);

  // Dynamic Polling Effect - Polls every 15 seconds (T6.2)
  useEffect(() => {
    setIsLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      
      const query = new URLSearchParams({ organizationId: DEFAULT_ORG, days: String(days) });
      if (selectedProject) query.set('projectId', selectedProject);

      const res = await fetch(`${API_URL}/api/v1/analytics/dora/export?${query}`, {
        headers,
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dora-metrics-${selectedProject || 'aggregate'}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const trend = dora?.trend ?? [];

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 size={24} className="text-primary" />
            <span>Engineering Analytics</span>
          </h1>
          <p className="page-subtitle">DORA metrics, deployment intelligence, and team performance</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {errorOccurred && (
            <span className="badge badge-danger flex items-center gap-1.5" style={{ fontSize: '0.75rem' }}>
              <AlertCircle size={12} />
              <span>Telemetry Offline</span>
            </span>
          )}

          {/* Repo Selector Dropdown (T6.3) */}
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              padding: '0.4rem 0.875rem', fontSize: '0.875rem', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">All Repositories (Team Aggregation)</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Days Filter */}
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value) as Days)}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              padding: '0.4rem 0.875rem', fontSize: '0.875rem', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>

          {/* Export DORA Report Button (T6.5) */}
          <button
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', padding: '0.45rem 0.875rem' }}
            onClick={handleExport}
            disabled={isExporting || errorOccurred}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {errorOccurred ? (
        <div className="card text-center" style={{ padding: '4rem 2rem', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)', borderRadius: 'var(--radius-lg)' }}>
          <AlertCircle size={48} className="text-red-500 mx-auto mb-3" />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Telemetry Service Offline</h3>
          <p className="text-sm text-secondary" style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
            Unable to establish connection with the DORA metrics gateway. Please ensure your backend is active or try manually reconnecting below.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', margin: '0 auto' }}>
            <RefreshCw size={12} /> Retry Connection
          </button>
        </div>
      ) : isLoading && !dora ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center' }} className="text-muted text-sm flex items-center justify-center gap-2">
          <RefreshCw size={16} className="animate-spin text-primary" /> Loading telemetry metrics...
        </div>
      ) : !dora || trend.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem 2rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-3" />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Telemetry Ingested Yet</h3>
          <p className="text-sm text-secondary" style={{ maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
            No successful pipelines or deployments are registered for this repository in the selected window. Run a CI pipeline or trigger a deployment to populate metrics.
          </p>
        </div>
      ) : (
        <>
          {/* DORA Four Key Metrics */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>DORA Four Key Metrics</p>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {[
                {
                  label: 'Deployment Frequency',
                  value: `${dora.deploymentFrequency.daily}/day`,
                  sub: `${dora.deploymentFrequency.weekly} this week`,
                  level: dora.deploymentFrequency.label,
                  icon: <Rocket size={16} className="text-cyan-400" />,
                  desc: 'How often you deploy to prod',
                },
                {
                  label: 'Lead Time for Changes',
                  value: `${dora.leadTime.avgHours}h`,
                  sub: 'commit → production',
                  level: dora.leadTime.label,
                  icon: <Clock size={16} className="text-indigo-400" />,
                  desc: 'From commit to production',
                },
                {
                  label: 'Change Failure Rate',
                  value: `${dora.changeFailureRate.percentage}%`,
                  sub: 'of deployments fail',
                  level: dora.changeFailureRate.label,
                  icon: <AlertTriangle size={16} className="text-red-400" />,
                  desc: 'Deployments causing incidents',
                },
                {
                  label: 'Mean Time to Recovery',
                  value: `${dora.mttr.avgMinutes}m`,
                  sub: 'avg recovery time',
                  level: dora.mttr.label,
                  icon: <Activity size={16} className="text-emerald-400" />,
                  desc: 'Time to restore from failure',
                },
              ].map((m, i) => (
                <motion.div
                  key={m.label}
                  className="stat-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="stat-label">{m.label}</span>
                    <span>{m.icon}</span>
                  </div>
                  <div className="stat-value">{m.value}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>{m.sub}</div>
                  <div
                    style={{
                      marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700,
                      background: `${doraLevelColor[m.level]}22`,
                      color: doraLevelColor[m.level],
                      border: `1px solid ${doraLevelColor[m.level]}33`,
                    }}
                  >
                    {m.level === 'Elite' ? <Trophy size={10} style={{ marginRight: 2 }} /> : m.level === 'High' ? <ArrowUpRight size={10} style={{ marginRight: 2 }} /> : m.level === 'Medium' ? <ArrowRight size={10} style={{ marginRight: 2 }} /> : <ArrowDownRight size={10} style={{ marginRight: 2 }} />}
                    <span>{m.level}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Deployment Trend Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem' }}>Deployment Volume</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trend}>
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                  <Bar dataKey="deployments" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Deployments" />
                  <Bar dataKey="failures" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failures" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem' }}>MTTR Trend (minutes)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="mttrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="mttr" stroke="#10b981" fill="url(#mttrGrad)" strokeWidth={2} name="MTTR (min)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline + AI Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Pipeline Summary */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem' }} className="flex items-center gap-1.5">
                <RefreshCw size={16} className="text-primary" />
                <span>Pipeline Summary</span>
              </h3>
              {pipelineStats ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {[
                    { label: 'Total Runs', value: pipelineStats.total.toLocaleString(), color: 'var(--text-primary)' },
                    { label: 'Succeeded', value: pipelineStats.succeeded.toLocaleString(), color: 'var(--accent-green)' },
                    { label: 'Failed', value: pipelineStats.failed.toLocaleString(), color: 'var(--accent-red)' },
                    { label: 'Success Rate', value: `${pipelineStats.successRate}%`, color: pipelineStats.successRate >= 90 ? 'var(--accent-green)' : pipelineStats.successRate >= 70 ? 'var(--accent-yellow)' : 'var(--accent-red)' },
                  ].map(row => (
                    <div key={row.label} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">{row.label}</span>
                        <span style={{ fontWeight: 700, color: row.color, fontFamily: 'monospace' }}>{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem' }}>
                  No pipeline data yet.<br />Push a commit to trigger your first pipeline.
                </div>
              )}
            </div>

            {/* AI Cost & Quality */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem' }} className="flex items-center gap-1.5">
                <Bot size={16} className="text-cyan-400" />
                <span>AI Intelligence Summary</span>
              </h3>
              {aiStats ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {[
                    { label: 'Total AI Reviews', value: aiStats.total.toLocaleString(), color: 'var(--text-primary)' },
                    { label: 'Approved', value: aiStats.approved.toLocaleString(), color: 'var(--accent-green)' },
                    { label: 'Blocked (High Risk)', value: aiStats.blocked.toLocaleString(), color: 'var(--accent-red)' },
                    { label: 'Avg Risk Score', value: `${aiStats.avgRiskScore}/100`, color: aiStats.avgRiskScore >= 60 ? 'var(--accent-red)' : aiStats.avgRiskScore >= 40 ? 'var(--accent-yellow)' : 'var(--accent-green)' },
                    { label: 'Total AI Cost', value: `$${aiStats.totalCostUsd}`, color: 'var(--accent-cyan)' },
                  ].map(row => (
                    <div key={row.label} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">{row.label}</span>
                        <span style={{ fontWeight: 700, color: row.color, fontFamily: 'monospace' }}>{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem' }}>
                  No AI reviews yet.<br />Connect a GitHub repo to start AI code reviews.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
