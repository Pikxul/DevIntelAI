'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, Legend } from 'recharts';
import { getDoraMetrics, getPipelineStats, getAIReviewStats, DoraMetrics } from '@/lib/api';
import {
  BarChart3,
  AlertTriangle,
  Rocket,
  Clock,
  Activity,
  Trophy,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  RefreshCw,
  Bot
} from 'lucide-react';

const DEFAULT_ORG = 'default-org';

// Fallback demo data when no backend data is available
const DEMO_TREND = [
  { date: 'May 15', deployments: 8, failures: 1, mttr: 18 },
  { date: 'May 16', deployments: 12, failures: 0, mttr: 0 },
  { date: 'May 17', deployments: 6, failures: 2, mttr: 32 },
  { date: 'May 18', deployments: 14, failures: 1, mttr: 12 },
  { date: 'May 19', deployments: 9, failures: 0, mttr: 0 },
  { date: 'May 20', deployments: 18, failures: 1, mttr: 8 },
  { date: 'May 21', deployments: 11, failures: 0, mttr: 0 },
  { date: 'May 22', deployments: 15, failures: 1, mttr: 22 },
];

const DEMO_DORA: DoraMetrics = {
  deploymentFrequency: { daily: 11, weekly: 77, label: 'Elite' },
  leadTime: { avgHours: 4.2, label: 'Elite' },
  changeFailureRate: { percentage: 6.8, label: 'High' },
  mttr: { avgMinutes: 14, label: 'Elite' },
  trend: DEMO_TREND,
};

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
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState<Days>(30);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([
      getDoraMetrics(DEFAULT_ORG, days),
      getPipelineStats(DEFAULT_ORG),
      getAIReviewStats(),
    ]).then(([doraRes, pipelineRes, aiRes]) => {
      if (doraRes.status === 'fulfilled') {
        setDora(doraRes.value);
      } else {
        setDora(DEMO_DORA);
        setUsingDemo(true);
      }
      if (pipelineRes.status === 'fulfilled') setPipelineStats(pipelineRes.value);
      if (aiRes.status === 'fulfilled') setAiStats(aiRes.value);
    }).finally(() => setIsLoading(false));
  }, [days]);

  const metrics = dora ?? DEMO_DORA;
  const trend = metrics.trend ?? DEMO_TREND;

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
        <div className="flex items-center gap-3">
          {usingDemo && (
            <span className="badge badge-warning flex items-center gap-1.5">
              <AlertTriangle size={12} />
              <span>Demo data — API not connected</span>
            </span>
          )}
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
        </div>
      </div>

      {/* DORA Four Key Metrics */}
      <div style={{ marginBottom: '0.75rem' }}>
        <p className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>DORA Four Key Metrics</p>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            {
              label: 'Deployment Frequency',
              value: isLoading ? '—' : `${metrics.deploymentFrequency.daily}/day`,
              sub: `${metrics.deploymentFrequency.weekly} this week`,
              level: metrics.deploymentFrequency.label,
              icon: <Rocket size={16} className="text-cyan-400" />,
              desc: 'How often you deploy to prod',
            },
            {
              label: 'Lead Time for Changes',
              value: isLoading ? '—' : `${metrics.leadTime.avgHours}h`,
              sub: 'commit → production',
              level: metrics.leadTime.label,
              icon: <Clock size={16} className="text-indigo-400" />,
              desc: 'From commit to production',
            },
            {
              label: 'Change Failure Rate',
              value: isLoading ? '—' : `${metrics.changeFailureRate.percentage}%`,
              sub: 'of deployments fail',
              level: metrics.changeFailureRate.label,
              icon: <AlertTriangle size={16} className="text-red-400" />,
              desc: 'Deployments causing incidents',
            },
            {
              label: 'Mean Time to Recovery',
              value: isLoading ? '—' : `${metrics.mttr.avgMinutes}m`,
              sub: 'avg recovery time',
              level: metrics.mttr.label,
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
    </div>
  );
}
