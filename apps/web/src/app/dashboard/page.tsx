'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { usePipelineStats, useAIReviewStats, useRecentPipelines, usePipelineChartData } from '@/hooks/useDashboard';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { PipelineRun } from '@/lib/api';

// ─── Stage config ─────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { icon: '📤', label: 'Push', key: 'code_push' },
  { icon: '🤖', label: 'AI Review', key: 'ai_review' },
  { icon: '🔒', label: 'Security', key: 'security_scan' },
  { icon: '🧪', label: 'Tests', key: 'unit_tests' },
  { icon: '🐳', label: 'Docker', key: 'containerize' },
  { icon: '🚀', label: 'Deploy', key: 'deploy' },
  { icon: '📈', label: 'Monitor', key: 'notify' },
];

// ─── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { success: 'badge-success', failed: 'badge-danger', running: 'badge-info', blocked: 'badge-warning', pending: 'badge-neutral' };
  const icons: Record<string, string> = { success: '✅', failed: '❌', running: '🔄', blocked: '🚫', pending: '⏳' };
  return <span className={`badge ${map[status] ?? 'badge-neutral'}`}>{icons[status]} {status}</span>;
}

function RiskBadge({ score }: { score: number }) {
  const cls = score >= 70 ? 'risk-critical' : score >= 50 ? 'risk-high' : score >= 30 ? 'risk-medium' : 'risk-low';
  return <span className={cls} style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{score}</span>;
}

function SkeletonCard() {
  return (
    <div className="stat-card" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ height: 14, width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 12 }} />
      <div style={{ height: 32, width: '40%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 8 }} />
      <div style={{ height: 12, width: '50%', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} />
    </div>
  );
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getRunningCount(pipelines: PipelineRun[]): number {
  return pipelines.filter((p) => p.status === 'running').length;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { stats: initialPipelineStats, isLoading: statsLoading } = usePipelineStats();
  const { stats: initialAiStats } = useAIReviewStats();
  const { pipelines, isLoading: pipelinesLoading } = useRecentPipelines();
  const chartData = usePipelineChartData();

  // Wrap with realtime hook
  const { pipelineStats, aiStats } = useRealtimeDashboard(initialPipelineStats, initialAiStats);

  // Build stat cards from real data
  const statsCards = pipelineStats
    ? [
        { label: 'Total Pipelines', value: pipelineStats.total.toLocaleString(), trend: `${pipelineStats.running} running`, up: true, icon: '🔄' },
        { label: 'Success Rate', value: `${pipelineStats.successRate}%`, trend: `${pipelineStats.succeeded} succeeded`, up: pipelineStats.successRate >= 80, icon: '✅' },
        { label: 'AI Reviews', value: aiStats ? aiStats.total.toLocaleString() : '—', trend: aiStats ? `${aiStats.approved} approved` : '...', up: true, icon: '🤖' },
        { label: 'Blocked (High Risk)', value: aiStats ? String(aiStats.blocked) : '—', trend: aiStats ? `avg risk: ${aiStats.avgRiskScore}` : '...', up: false, icon: '🚫' },
        { label: 'Running Now', value: String(pipelineStats.running), trend: `${pipelineStats.failed} failed`, up: pipelineStats.running > 0, icon: '⚡' },
        { label: 'AI Review Cost', value: aiStats ? `$${aiStats.totalCostUsd}` : '—', trend: 'total spend', up: true, icon: '💰' },
      ]
    : null;

  // Get active pipeline stages from the most recent running pipeline
  const activePipeline = pipelines.find((p) => p.status === 'running');
  const activeStages = activePipeline?.stages ?? [];

  const getStageStatus = (key: string): 'success' | 'running' | 'pending' | 'failed' => {
    const stage = activeStages.find((s: any) => s.name === key);
    return (stage?.status as any) ?? 'pending';
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Pipeline Overview</h1>
          <p className="page-subtitle">Real-time AI DevOps intelligence dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${pipelineStats?.running ? 'badge-info' : 'badge-success'}`}>
            {pipelineStats?.running ? `🔄 ${pipelineStats.running} running` : '🟢 All systems operational'}
          </span>
          <Link href="/dashboard/pipelines" className="btn btn-primary btn-sm">+ New Pipeline</Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statsLoading || !statsCards
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : statsCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="stat-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label">{stat.label}</span>
                  <span style={{ fontSize: '1.25rem' }}>{stat.icon}</span>
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className={`stat-trend ${stat.up ? 'trend-up' : 'trend-down'}`}>
                  {stat.up ? '▲' : '▼'} {stat.trend}
                </div>
              </motion.div>
            ))}
      </div>

      {/* Active Pipeline Stage */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="flex items-center justify-between mb-4">
          <h3>
            {activePipeline
              ? `Active: ${activePipeline.projectId} — ${activePipeline.branch}`
              : 'Pipeline Stages'}
          </h3>
          <span className={`badge ${getRunningCount(pipelines) > 0 ? 'badge-info' : 'badge-neutral'}`}>
            {getRunningCount(pipelines) > 0 ? `🔄 ${getRunningCount(pipelines)} running` : '⏳ No active runs'}
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
        {!activePipeline && (
          <p className="text-muted text-xs" style={{ marginTop: '1rem', textAlign: 'center' }}>
            Push to a connected GitHub repo to trigger a live pipeline run
          </p>
        )}
      </div>

      {/* Chart + AI Costs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Pipeline Activity Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Pipeline Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9' }}
              />
              <Area type="monotone" dataKey="success" stroke="#10b981" fill="url(#colorSuccess)" strokeWidth={2} />
              <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#colorFailed)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Review Costs */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>AI Review Stats</h3>
          {aiStats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                { label: 'Total Reviews', value: aiStats.total.toString(), color: 'var(--accent-purple-light)' },
                { label: 'Approved', value: aiStats.approved.toString(), color: 'var(--accent-green)' },
                { label: 'Blocked (High Risk)', value: aiStats.blocked.toString(), color: '#ef4444' },
                { label: 'Avg Risk Score', value: `${aiStats.avgRiskScore}/100`, color: 'var(--accent-blue)' },
                { label: 'Total AI Cost', value: `$${aiStats.totalCostUsd}`, color: 'var(--accent-cyan)' },
              ].map((row) => (
                <div key={row.label} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary">{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.color, fontFamily: 'monospace' }}>{row.value}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted text-sm" style={{ padding: '2rem', textAlign: 'center' }}>
              No AI reviews yet. Connect GitHub to start.
            </div>
          )}
        </div>
      </div>

      {/* Recent Pipelines Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="flex items-center justify-between mb-4">
          <h3>Recent Pipeline Runs</h3>
          <Link href="/dashboard/pipelines" className="btn btn-secondary btn-sm">View All</Link>
        </div>

        {pipelinesLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted text-sm">Loading pipelines…</div>
        ) : pipelines.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚀</div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No pipeline runs yet</p>
            <p className="text-muted text-sm">Connect a GitHub repo and push a commit to trigger your first AI review</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Branch</th>
                  <th>Author</th>
                  <th>Trigger</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pipelines.map((p) => (
                  <tr key={p.id}>
                    <td><span style={{ fontWeight: 600 }}>{p.projectId}</span></td>
                    <td>
                      <code className="font-mono text-xs" style={{ color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                        {p.branch}
                      </code>
                    </td>
                    <td className="text-secondary">{p.author}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                        {p.triggeredBy === 'push' ? '📤' : p.triggeredBy === 'pull_request' ? '🔀' : '▶️'} {p.triggeredBy}
                      </span>
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="text-muted text-xs">{formatTimeAgo(p.createdAt)}</td>
                    <td>
                      <Link href={`/dashboard/pipelines/${p.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.625rem' }}>
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
