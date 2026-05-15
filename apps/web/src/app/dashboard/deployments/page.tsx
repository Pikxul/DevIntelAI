'use client';
import { motion } from 'framer-motion';

const deployments = [
  { id: 'd-001', project: 'api-service', env: 'production', strategy: 'rolling', image: 'api-service:v2.4.1', status: 'success', duration: '45s', time: '5m ago' },
  { id: 'd-002', project: 'web-app', env: 'staging', strategy: 'blue_green', image: 'web-app:v1.9.3', status: 'running', duration: '—', time: '8m ago' },
  { id: 'd-003', project: 'ml-pipeline', env: 'production', strategy: 'canary', image: 'ml:v3.1.0', status: 'failed', duration: '2m 10s', time: '1h ago' },
  { id: 'd-004', project: 'auth-service', env: 'production', strategy: 'rolling', image: 'auth:v5.0.2', status: 'success', duration: '38s', time: '2h ago' },
];

const envColor: Record<string, string> = { production: 'badge-danger', staging: 'badge-warning', development: 'badge-info' };
const statusColor: Record<string, string> = { success: 'badge-success', failed: 'badge-danger', running: 'badge-info' };

export default function DeploymentsPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">🚀 Deployments</h1>
          <p className="page-subtitle">Deployment history, canary controls & rollback</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-success">23 deployments today</span>
        </div>
      </div>

      {/* Strategy breakdown */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
        {[
          { label: 'Rolling Updates', value: '18', icon: '🔄', desc: 'Zero downtime' },
          { label: 'Blue/Green', value: '4', icon: '🔵', desc: 'Instant switch' },
          { label: 'Canary', value: '1', icon: '🐦', desc: '5% → 100%' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">{s.label}</span>
              <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>{s.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Deployments Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Recent Deployments</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Environment</th>
                <th>Strategy</th>
                <th>Image</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d) => (
                <tr key={d.id}>
                  <td><span style={{ fontWeight: 600 }}>{d.project}</span></td>
                  <td><span className={`badge ${envColor[d.env] ?? 'badge-neutral'}`}>{d.env}</span></td>
                  <td><span className="badge badge-neutral">{d.strategy}</span></td>
                  <td><code className="font-mono text-xs" style={{ color: 'var(--accent-cyan)' }}>{d.image}</code></td>
                  <td><span className={`badge ${statusColor[d.status] ?? 'badge-neutral'}`}>{d.status}</span></td>
                  <td className="text-secondary text-sm">{d.duration}</td>
                  <td className="text-muted text-xs">{d.time}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-secondary btn-sm">Details</button>
                      {d.status === 'success' && <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>Rollback</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
