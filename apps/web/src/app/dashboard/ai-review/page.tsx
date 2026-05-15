'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

const reviews = [
  { id: 'r-001', project: 'api-service', branch: 'main', riskScore: 23, level: 'low', issues: 2, approved: true, provider: 'OpenAI', cost: '$0.003', time: '2m ago' },
  { id: 'r-002', project: 'auth-service', branch: 'feat/oauth', riskScore: 45, level: 'medium', issues: 7, approved: true, provider: 'Claude', cost: '$0.004', time: '8m ago' },
  { id: 'r-003', project: 'ml-pipeline', branch: 'main', riskScore: 87, level: 'critical', issues: 14, approved: false, provider: 'OpenAI', cost: '$0.008', time: '12m ago' },
  { id: 'r-004', project: 'data-service', branch: 'refactor', riskScore: 62, level: 'high', issues: 9, approved: false, provider: 'OpenAI', cost: '$0.005', time: '18m ago' },
  { id: 'r-005', project: 'web-app', branch: 'fix/ui', riskScore: 12, level: 'low', issues: 1, approved: true, provider: 'Claude', cost: '$0.002', time: '25m ago' },
];

const colorMap: Record<string, string> = {
  low: 'var(--accent-green)', medium: 'var(--accent-yellow)',
  high: 'var(--accent-orange)', critical: 'var(--accent-red)',
};

export default function AIReviewPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">🤖 AI Code Reviews</h1>
          <p className="page-subtitle">GPT-4o + Claude 3.5 Sonnet risk analysis results</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-purple">Avg Risk: 45/100</span>
          <span className="badge badge-success">$0.024 today</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '2rem' }}>
        {[
          { label: 'Total Reviews', value: '3,891', icon: '📋', color: 'var(--accent-purple-light)' },
          { label: 'Approved', value: '3,677', icon: '✅', color: 'var(--accent-green)' },
          { label: 'Blocked', value: '214', icon: '🚫', color: 'var(--accent-red)' },
          { label: 'Avg Cost', value: '$0.003', icon: '💰', color: 'var(--accent-cyan)' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">{s.label}</span>
              <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
            </div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Reviews Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Recent AI Reviews</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Branch</th>
                <th>Risk Score</th>
                <th>Issues</th>
                <th>Decision</th>
                <th>Provider</th>
                <th>Cost</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td><span style={{ fontWeight: 600 }}>{r.project}</span></td>
                  <td><code className="font-mono text-xs" style={{ color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: 4 }}>{r.branch}</code></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 60, height: 6, background: 'var(--bg-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${r.riskScore}%`, height: '100%', background: colorMap[r.level], borderRadius: 3 }} />
                      </div>
                      <span style={{ fontWeight: 700, color: colorMap[r.level], fontFamily: 'monospace' }}>{r.riskScore}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-neutral">{r.issues} issues</span></td>
                  <td>{r.approved ? <span className="badge badge-success">✅ Approved</span> : <span className="badge badge-danger">🚫 Blocked</span>}</td>
                  <td><span className="badge badge-purple">{r.provider}</span></td>
                  <td className="font-mono text-xs">{r.cost}</td>
                  <td className="text-muted text-xs">{r.time}</td>
                  <td><Link href={`/dashboard/ai-review/${r.id}`} className="btn btn-secondary btn-sm">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
