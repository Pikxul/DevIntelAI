'use client';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart3, CheckCircle2, Zap, AlertTriangle, TrendingUp, AlertCircle, Check } from 'lucide-react';

const cpuData = [
  { time: '6h', cpu: 28, memory: 58 },
  { time: '5h', cpu: 35, memory: 62 },
  { time: '4h', cpu: 22, memory: 55 },
  { time: '3h', cpu: 40, memory: 65 },
  { time: '2h', cpu: 30, memory: 60 },
  { time: '1h', cpu: 18, memory: 53 },
  { time: 'Now', cpu: 24, memory: 57 },
];

const requestData = [
  { time: '6h', rps: 1400, p99: 75 },
  { time: '5h', rps: 1800, p99: 95 },
  { time: '4h', rps: 1200, p99: 65 },
  { time: '3h', rps: 1600, p99: 120 },
  { time: '2h', rps: 1900, p99: 88 },
  { time: '1h', rps: 1350, p99: 72 },
  { time: 'Now', rps: 1847, p99: 82 },
];

const errorData = [
  { time: '6h', rate: 0.08 },
  { time: '5h', rate: 0.12 },
  { time: '4h', rate: 0.05 },
  { time: '3h', rate: 0.31 },
  { time: '2h', rate: 0.09 },
  { time: '1h', rate: 0.04 },
  { time: 'Now', rate: 0.04 },
];

const services = [
  { name: 'api-gateway', status: 'healthy', uptime: '99.97%', latency: '42ms', rps: '1,847', cpu: '23%', memory: '61%' },
  { name: 'auth-service', status: 'healthy', uptime: '99.99%', latency: '18ms', rps: '923', cpu: '11%', memory: '44%' },
  { name: 'data-service', status: 'degraded', uptime: '98.21%', latency: '210ms', rps: '456', cpu: '67%', memory: '78%' },
  { name: 'ml-pipeline', status: 'healthy', uptime: '99.89%', latency: '380ms', rps: '124', cpu: '45%', memory: '82%' },
  { name: 'web-frontend', status: 'healthy', uptime: '100%', latency: '12ms', rps: '4,201', cpu: '8%', memory: '29%' },
];

const statusStyle: Record<string, { badge: string; dot: string }> = {
  healthy: { badge: 'badge-success', dot: '#10b981' },
  degraded: { badge: 'badge-warning', dot: '#f59e0b' },
  down: { badge: 'badge-danger', dot: '#ef4444' },
};

export default function MonitoringPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={24} className="text-purple-400" /> Monitoring
          </h1>
          <p className="page-subtitle">Real-time infrastructure observability and SLO tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <Check size={14} className="text-emerald-500" /> All systems operational
          </span>
          <span className="badge badge-neutral">Last updated: just now</span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '2rem' }}>
        {[
          { label: 'Avg Uptime (30d)', value: '99.97%', icon: <CheckCircle2 size={18} className="text-emerald-500" />, color: 'var(--accent-green)' },
          { label: 'p99 Latency', value: '82ms', icon: <Zap size={18} className="text-cyan-500" />, color: 'var(--accent-cyan)' },
          { label: 'Error Rate', value: '0.04%', icon: <AlertTriangle size={18} className="text-amber-500" />, color: 'var(--accent-yellow)' },
          { label: 'Requests/min', value: '7,551', icon: <TrendingUp size={18} className="text-purple-400" />, color: 'var(--accent-purple-light)' },
          { label: 'Active Alerts', value: '1', icon: <AlertCircle size={18} className="text-red-500 animate-pulse" />, color: 'var(--accent-red)' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">{s.label}</span>
              {s.icon}
            </div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem' }}>CPU & Memory</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={cpuData}>
              <defs>
                <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9' }} />
              <Area type="monotone" dataKey="cpu" stroke="#7c3aed" fill="url(#cpu)" strokeWidth={2} name="CPU" />
              <Area type="monotone" dataKey="memory" stroke="#06b6d4" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Memory" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem' }}>Request Rate & Latency</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={requestData}>
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9' }} />
              <Line type="monotone" dataKey="rps" stroke="#10b981" strokeWidth={2} dot={false} name="RPS" />
              <Line type="monotone" dataKey="p99" stroke="#f59e0b" strokeWidth={2} dot={false} name="p99 (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem' }}>Error Rate (%)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={errorData}>
              <defs>
                <linearGradient id="err" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9' }} />
              <Area type="monotone" dataKey="rate" stroke="#ef4444" fill="url(#err)" strokeWidth={2} name="Error Rate" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Services Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Service Health</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Uptime</th>
                <th>Latency (p99)</th>
                <th>Requests/s</th>
                <th>CPU</th>
                <th>Memory</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.name}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusStyle[s.status]?.dot ?? '#64748b', flexShrink: 0 }} />
                      <code className="font-mono text-xs" style={{ color: 'var(--accent-cyan)' }}>{s.name}</code>
                    </div>
                  </td>
                  <td><span className={`badge ${statusStyle[s.status]?.badge ?? 'badge-neutral'}`}>{s.status}</span></td>
                  <td className="font-mono text-xs text-secondary">{s.uptime}</td>
                  <td className="font-mono text-xs text-secondary">{s.latency}</td>
                  <td className="font-mono text-xs text-secondary">{s.rps}</td>
                  <td className="text-sm">{s.cpu}</td>
                  <td className="text-sm">{s.memory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
