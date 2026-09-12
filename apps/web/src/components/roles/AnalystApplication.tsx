'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BarChart3, Gauge, TrendingUp, DollarSign, Cpu, AlertTriangle,
  Download, FileText, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Clock, Shield, Activity, Calendar
} from 'lucide-react';
import { useAIReviewStats, usePipelineStats } from '@/hooks/useDashboard';

interface DoraMetric {
  name: string;
  value: string;
  unit: string;
  status: 'elite' | 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'neutral';
  delta: string;
  industryBenchmark: string;
  description: string;
}

const DORA_METRICS: DoraMetric[] = [
  {
    name: 'Deployment Frequency',
    value: '4.8',
    unit: 'deploys / day',
    status: 'elite',
    trend: 'up',
    delta: '+18% MoM',
    industryBenchmark: 'Elite: Multiple per day',
    description: 'Frequency of successful deployments to production clusters',
  },
  {
    name: 'Lead Time for Changes',
    value: '28',
    unit: 'minutes',
    status: 'elite',
    trend: 'down',
    delta: '-12m faster',
    industryBenchmark: 'Elite: Less than 1 hour',
    description: 'Time from commit to code running in production',
  },
  {
    name: 'Change Failure Rate',
    value: '1.2',
    unit: '%',
    status: 'elite',
    trend: 'down',
    delta: '-0.4% MoM',
    industryBenchmark: 'Elite: 0% - 15%',
    description: 'Percentage of deployments causing degraded service or outage',
  },
  {
    name: 'Time to Restore Service',
    value: '14',
    unit: 'minutes',
    status: 'elite',
    trend: 'down',
    delta: '-6m faster',
    industryBenchmark: 'Elite: Less than 1 hour',
    description: 'Mean time to recover (MTTR) when production incidents occur',
  },
];

export default function AnalystApplication() {
  const { stats: aiStats } = useAIReviewStats();
  const { stats: pipelineStats } = usePipelineStats();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExportCSV = () => {
    setExporting('csv');
    const headers = 'Metric,Value,Unit,Tier,Delta,Benchmark\n';
    const rows = DORA_METRICS.map(
      (m) => `"${m.name}","${m.value}","${m.unit}","${m.status}","${m.delta}","${m.industryBenchmark}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dora-intelligence-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => setExporting(null), 1000);
  };

  const handleExportJSON = () => {
    setExporting('json');
    const data = {
      generatedAt: new Date().toISOString(),
      doraMetrics: DORA_METRICS,
      aiTelemetry: aiStats ?? {
        totalScans: 480,
        approved: 440,
        avgRiskScore: 24,
        totalCostUsd: '42.80',
      },
      pipelineSuccessRate: pipelineStats?.successRate ?? 99.4,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `devintel-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => setExporting(null), 1000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── Intelligence & Analytics Header ───────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(17, 24, 39, 0.6) 100%)',
          border: '1px solid rgba(249, 115, 22, 0.25)',
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
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
              flexShrink: 0,
            }}
          >
            <BarChart3 size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Engineering Intelligence
              </h1>
              <span
                style={{
                  background: 'rgba(249, 115, 22, 0.2)',
                  color: '#fdba74',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
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
                <Gauge size={12} /> DORA Analyst
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Statistical Velocity Modeling, AI Cost Efficiencies, and Reliability Analytics
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting === 'csv'}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={14} /> {exporting === 'csv' ? 'Exporting...' : 'Export DORA CSV'}
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            disabled={exporting === 'json'}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <FileText size={14} /> {exporting === 'json' ? 'Exporting...' : 'Export JSON Dataset'}
          </button>
        </div>
      </div>

      {/* ── DORA 4 Core Metrics Grid ──────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Gauge size={18} className="text-orange-400" />
            Four Core DORA Metrics (Google DevOps Research)
          </h2>
          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
            STATUS: ELITE PERFORMER
          </span>
        </div>

        <div className="kpi-grid">
          {DORA_METRICS.map((metric, idx) => (
            <motion.div
              key={metric.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                padding: 'clamp(1rem, 2vw, 1.25rem)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {metric.name}
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '0.625rem', textTransform: 'uppercase' }}>
                    {metric.status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {metric.value}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{metric.unit}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  {metric.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {metric.delta}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {metric.industryBenchmark}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Main Analytical Deep-Dive Grid ─────────────────────────────────── */}
      <div className="dashboard-grid">
        {/* Left Column (8 cols): AI Cost Efficiency & Provider Performance */}
        <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* AI Review Provider Economics */}
          <section className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <DollarSign size={18} className="text-emerald-400" />
                  AI Review Economics & Token Utilization
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  Monthly review spend and token distribution across configured foundation models
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg. Cost per PR</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-green)' }}>$0.042</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {[
                { provider: 'Claude 3.5 Sonnet', share: '62% volume', latency: '1.4s avg', cost: '$24.60', status: 'Primary' },
                { provider: 'GPT-4o', share: '26% volume', latency: '1.2s avg', cost: '$12.40', status: 'Fallback' },
                { provider: 'DeepSeek-Coder V2', share: '12% volume', latency: '0.8s avg', cost: '$2.80', status: 'Experimental' },
              ].map((prov) => (
                <div
                  key={prov.provider}
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{prov.provider}</span>
                    <span className="badge badge-purple" style={{ fontSize: '0.625rem' }}>{prov.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>{prov.share}</span>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{prov.cost}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Latency: {prov.latency}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Tokens Consumed</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>3,420,192</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Security Vulns Preempted</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-green)' }}>48 Prevented</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Engineering Hours Saved</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>~184 hrs/mo</div>
              </div>
            </div>
          </section>

          {/* Incident Attribution & Root Cause Analysis */}
          <section className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Incident Severity & Root Cause Distribution</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 30 Days</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { cause: 'Infrastructure / Pod OOMKill', pct: 40, count: '4 incidents', color: '#f59e0b' },
                { cause: 'Downstream Cloud API Latency', pct: 35, count: '3 incidents', color: '#818cf8' },
                { cause: 'Code Regression / Null Pointer', pct: 25, count: '2 incidents', color: '#f87171' },
              ].map((item) => (
                <div key={item.cause}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.cause}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.pct}% ({item.count})</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: 9999 }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column (4 cols): Reliability Benchmarks & Quick Access */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Engineering Reliability Rating */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={16} className="text-cyan-400" />
              Reliability Scorecard
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { metric: 'Mean Time Between Failures (MTBF)', val: '184 hours' },
                { metric: 'SLA Budget Remaining', val: '99.8% (Optimal)' },
                { metric: 'Critical Flaky Test Rate', val: '0.4% (Passing)' },
                { metric: 'Pipeline Build P95 Duration', val: '4m 12s' },
              ].map((r) => (
                <div
                  key={r.metric}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    background: 'var(--bg-surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{r.metric}</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Reports Navigation */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem' }}>Analytical Views</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Deep DORA Trends', href: '/dashboard/analytics', desc: 'Historical 90-day charts' },
                { label: 'Observability & Metrics', href: '/dashboard/monitoring', desc: 'Prometheus & Grafana feeds' },
                { label: 'AI Review Audit Log', href: '/dashboard/ai-review', desc: 'Detailed code inspection history' },
                { label: 'Governance & Compliance', href: '/dashboard/governance', desc: 'Regulatory verification' },
              ].map((view) => (
                <Link
                  key={view.label}
                  href={view.href}
                  style={{
                    display: 'block',
                    padding: '0.75rem',
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{view.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{view.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
