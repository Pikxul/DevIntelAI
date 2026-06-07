'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { usePipelineStats, useAIReviewStats, useRecentPipelines, usePipelineChartData, useActiveAlerts } from '@/hooks/useDashboard';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { ArrowUpCircle, Bot, Shield, FlaskConical, Database, Rocket, TrendingUp, CheckCircle2, XCircle, RefreshCw, Slash, Clock, AlertTriangle, AlertCircle, Cpu, FileText, Activity, Sliders, Zap, Search } from 'lucide-react';

const PIPELINE_STAGES = [
  { icon: <ArrowUpCircle size={16} />, label: 'Push', key: 'code_push' },
  { icon: <Bot size={16} />, label: 'AI Review', key: 'ai_review' },
  { icon: <Shield size={16} />, label: 'Security', key: 'security_scan' },
  { icon: <FlaskConical size={16} />, label: 'Tests', key: 'unit_tests' },
  { icon: <Database size={16} />, label: 'Docker', key: 'containerize' },
  { icon: <Rocket size={16} />, label: 'Deploy', key: 'deploy' },
  { icon: <TrendingUp size={16} />, label: 'Monitor', key: 'notify' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { success: 'badge-success', failed: 'badge-danger', running: 'badge-info', blocked: 'badge-warning', pending: 'badge-neutral' };
  
  const getIcon = () => {
    switch (status) {
      case 'success': return <CheckCircle2 size={12} className="inline mr-1 text-emerald-500" />;
      case 'failed': return <XCircle size={12} className="inline mr-1 text-red-500" />;
      case 'running': return <RefreshCw size={12} className="inline mr-1 animate-spin text-blue-500" />;
      case 'blocked': return <Slash size={12} className="inline mr-1 text-amber-500" />;
      case 'pending':
      default: return <Clock size={12} className="inline mr-1 text-gray-500" />;
    }
  };

  return (
    <span className={`badge ${map[status] ?? 'badge-neutral'}`} style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center' }}>
      {getIcon()}
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const { stats: initialPipelineStats, isLoading: statsLoading } = usePipelineStats();
  const { stats: initialAiStats } = useAIReviewStats();
  const { pipelines, isLoading: pipelinesLoading } = useRecentPipelines();
  const chartData = usePipelineChartData();
  const { alerts, isLoading: alertsLoading } = useActiveAlerts();

  const { pipelineStats, aiStats } = useRealtimeDashboard(initialPipelineStats, initialAiStats);

  const activePipeline = pipelines.find((p) => p.status === 'running');
  const activeStages = activePipeline?.stages ?? [];

  const getStageStatus = (key: string): 'success' | 'running' | 'pending' | 'failed' => {
    const stage = activeStages.find((s: any) => s.name === key);
    return (stage?.status as any) ?? 'pending';
  };

  const successRate = pipelineStats ? `${pipelineStats.successRate}%` : '99.8%';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Active Alert Banners ────────────────────────────────────────── */}
      {alerts && alerts.map((alert) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(139,92,246,0.08) 100%)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(1rem, 2vw, 1.25rem) clamp(1rem, 2vw, 1.5rem)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
          }}
        >
          <div className="alert-banner">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <AlertCircle size={28} className={alert.severity === 'critical' || alert.severity === 'high' ? 'text-red-500 animate-pulse' : 'text-amber-500'} style={{ flexShrink: 0, marginTop: '0.25rem' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)', color: 'var(--text-primary)' }}>{alert.title}</span>
                  <span className={`badge ${alert.severity === 'critical' || alert.severity === 'high' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.625rem' }}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {alert.description}
                  {alert.recommendation && (
                    <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      💡 Recommendation: {alert.recommendation}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="alert-banner-actions">
              <Link href="/dashboard/incidents" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <Search size={12} /> Incident Logs
              </Link>
            </div>
          </div>
        </motion.div>
      ))}

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">System Control Overview</h1>
          <p className="page-subtitle" style={{ fontSize: '0.875rem' }}>Real-time DORA engineering metrics and deployment intelligence</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge ${pipelineStats?.running ? 'badge-info' : 'badge-success'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            {pipelineStats?.running ? (
              <><RefreshCw size={12} className="animate-spin" /> {pipelineStats.running} Running</>
            ) : (
              <><CheckCircle2 size={12} /> All Systems Operational</>
            )}
          </span>
          <Link href="/dashboard/pipelines" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <Zap size={14} /> Run Pipeline
          </Link>
        </div>
      </div>

      {/* ── Main Responsive Grid ─────────────────────────────────────────── */}
      <div className="dashboard-grid">

        {/* Left 8 columns */}
        <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* KPI Row: 4 cards */}
          <div className="kpi-grid">
            {[
              { label: 'Success Rate', icon: <CheckCircle2 size={14} className="text-emerald-500" />, tag: 'DORA', value: successRate, delta: '▲ +0.2%', deltaColor: 'var(--accent-green)' },
              { label: 'MTTR', icon: <Clock size={14} className="text-purple-400" />, tag: 'SRE', value: '14m', delta: '▼ -2m', deltaColor: 'var(--accent-green)' },
              { label: 'Security', icon: <Shield size={14} className="text-blue-500" />, tag: 'Audit', value: 'A+', delta: '0 CVEs', deltaColor: 'var(--text-muted)' },
              { label: 'Risk Trend', icon: <TrendingUp size={14} className="text-cyan-500" />, tag: 'AI', value: 'Low', delta: 'Stable', deltaColor: 'var(--text-muted)' },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: 'clamp(1rem, 2vw, 1.25rem)', borderRadius: 'var(--radius-lg)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', gap: '0.25rem' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {kpi.icon} {kpi.label}
                  </span>
                  <span style={{ flexShrink: 0 }}>{kpi.tag}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 800 }}>{kpi.value}</span>
                  <span style={{ fontSize: '0.6875rem', color: kpi.deltaColor, fontWeight: 600 }}>{kpi.delta}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* System Health Gauge */}
          <section className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Security & Deployment Risk Posture</h3>
              <span className="badge badge-success" style={{ fontSize: '0.6875rem', flexShrink: 0 }}>HEALTH SCORE: 92%</span>
            </div>

            <div className="health-gauge-grid">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 140, height: 140 }}>
                  <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="7" />
                    <motion.circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="var(--accent-purple)"
                      strokeWidth="7"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: '264', strokeDashoffset: '264' }}
                      animate={{ strokeDashoffset: String(264 - (264 * 92) / 100) }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>92/100</span>
                    <span style={{ fontSize: '0.5625rem', fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4, textAlign: 'center' }}>System Integrity</span>
                  </div>
                </div>
              </div>

              <div className="health-risk-grid">
                {[
                  { label: 'Security risk', icon: <Shield size={12} className="text-blue-500" />, val: 'Low', color: 'var(--accent-green)', desc: 'No unpatched CVE files' },
                  { label: 'Deployment risk', icon: <Rocket size={12} className="text-emerald-500" />, val: 'Minimal', color: 'var(--accent-green)', desc: 'Rolling update stable' },
                  { label: 'Quality metrics', icon: <Activity size={12} className="text-purple-400" />, val: '98%', color: 'var(--accent-purple-light)', desc: 'AI test coverage optimal' },
                  { label: 'Scale overhead', icon: <Sliders size={12} className="text-cyan-500" />, val: 'Normal', color: 'var(--accent-cyan)', desc: '14 replicas running' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: '0.25rem' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {item.icon} {item.label}
                      </span>
                      <span style={{ color: item.color, fontWeight: 700, flexShrink: 0 }}>{item.val}</span>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Active Pipeline Flow */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                {activePipeline
                  ? `Active Deployment: ${activePipeline.projectId} (${activePipeline.branch})`
                  : 'System Automation Pipeline Stream'}
              </h3>
              <span className={`badge ${activePipeline ? 'badge-info' : 'badge-neutral'}`} style={{ fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                {activePipeline ? (
                  <><RefreshCw size={12} className="animate-spin" /> Running: {activePipeline.stages.find(s => s.status === 'running')?.name ?? 'deploy'}</>
                ) : (
                  <><Clock size={12} /> Pipelines Idle</>
                )}
              </span>
            </div>
            <div className="pipeline-flow">
              {PIPELINE_STAGES.map((stage, i) => {
                const status = activePipeline ? getStageStatus(stage.key) : 'pending';
                return (
                  <div key={stage.label} className="flex items-center">
                    <div className="stage-node">
                      <div className={`stage-icon ${status}`}>{stage.icon}</div>
                      <span className="stage-label">{stage.label}</span>
                    </div>
                    {i < PIPELINE_STAGES.length - 1 && (
                      <div className={`stage-connector ${status === 'success' ? 'active' : ''}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipeline History Table */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Active Repositories & Release Risk Audit</h3>
              <Link href="/dashboard/pipelines" className="btn btn-secondary btn-sm">View All Records</Link>
            </div>
            {pipelinesLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted text-sm">Loading telemetry metrics...</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Repository</th>
                      <th>Branch</th>
                      <th>Triggered By</th>
                      <th>Status</th>
                      <th>Risk</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelines.slice(0, 4).map(p => {
                      const riskScore = p.status === 'failed' ? 78 : p.status === 'blocked' ? 84 : 18;
                      const isHighRisk = riskScore >= 70;
                      return (
                        <tr key={p.id}>
                          <td><span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{p.projectId}</span></td>
                          <td><code className="font-mono text-xs" style={{ background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{p.branch}</code></td>
                          <td style={{ fontSize: '0.8125rem' }}>{p.triggeredBy}</td>
                          <td><StatusBadge status={p.status} /></td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: isHighRisk ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                            {riskScore}/100
                          </td>
                          <td>
                            <svg height="16" width="60" style={{ fill: 'none', strokeWidth: 1.5, stroke: isHighRisk ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                              <path d={isHighRisk ? 'M0,16 L15,14 L30,12 L45,4 L60,0' : 'M0,4 L15,6 L30,2 L45,10 L60,8'} />
                            </svg>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 columns */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Telemetry Sparkline */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Telemetry Volume Trends</h3>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '0.75rem' }} />
                <Area type="monotone" dataKey="success" stroke="var(--accent-green)" fill="url(#successGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 8 }}>
              <span>00:00</span>
              <span>LIVE STREAM</span>
              <span>23:59</span>
            </div>
          </div>

          {/* AI Recommendation Card */}
          <div className="card ai-rec-card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(139,92,246,0.15)', paddingBottom: '0.5rem', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={16} className="text-purple-400" />
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Contextual Recommendation</span>
              </div>
              <span className="badge badge-purple" style={{ fontSize: '0.55rem', flexShrink: 0 }}>ACTIVE</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Database queries in namespace <code style={{ color: 'var(--accent-cyan)' }}>inventory-db</code> demonstrate high lock wait intervals (3.2s). Applying the recommended operational index:
            </p>
            <code className="font-mono" style={{ fontSize: '0.6875rem', display: 'block', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: 4, color: 'var(--accent-purple-light)', wordBreak: 'break-all' }}>
              CREATE INDEX CONCURRENTLY idx_orders_status_date ON orders (status, order_date);
            </code>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Write load reduction: 22% · IOPS optimization: 14%
            </p>
            <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <FileText size={14} /> Apply Governance Policy
            </button>
          </div>

          {/* AI Code Review Stats */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>AI Static Code Analysis</h3>
            {aiStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Total Scanned Commits', val: aiStats.total, color: 'var(--text-primary)' },
                  { label: 'Auto-Approved', val: aiStats.approved, color: 'var(--accent-green)' },
                  { label: 'Blocked Policy Gates', val: aiStats.blocked, color: 'var(--accent-red)' },
                  { label: 'Average Risk Rating', val: `${aiStats.avgRiskScore}/100`, color: 'var(--accent-purple-light)' },
                  { label: 'SaaS Token Cost Today', val: `$${aiStats.totalCostUsd}`, color: 'var(--accent-cyan)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8125rem', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.color, fontFamily: 'monospace', flexShrink: 0 }}>{row.val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted text-sm" style={{ textAlign: 'center' }}>No reviews ingested.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
