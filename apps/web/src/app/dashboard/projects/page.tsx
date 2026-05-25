'use client';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { getProjects, createProject, Project } from '@/lib/api';
import { Folder, RefreshCw, Zap, Plus, Github, Gitlab, AlertTriangle, Clock, Settings } from 'lucide-react';

const langColors: Record<string, string> = {
  TypeScript: '#3178c6',
  Go: '#00add8',
  Python: '#f7b731',
  Rust: '#f46524',
  JavaScript: '#f0db4f',
  Java: '#f89820',
};

const statusBadge: Record<string, string> = {
  passing: 'badge-success',
  failing: 'badge-danger',
  blocked: 'badge-warning',
  active: 'badge-info',
};

function ConnectRepoModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '',
    repoUrl: '',
    repoProvider: 'github' as 'github' | 'gitlab',
    defaultBranch: 'main',
    riskThreshold: '70',
    organizationId: 'default-org',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createProject({
        ...form,
        slug: form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        riskThreshold: parseInt(form.riskThreshold),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1.5rem',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '2rem',
          width: '100%', maxWidth: 520,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
          <h3>Connect Repository</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { label: 'Project Name', key: 'name', placeholder: 'e.g. api-service', type: 'text' },
            { label: 'Repository URL', key: 'repoUrl', placeholder: 'https://github.com/org/repo', type: 'url' },
            { label: 'Default Branch', key: 'defaultBranch', placeholder: 'main', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                {f.label}
              </label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                required
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', padding: '0.6rem 0.875rem',
                  fontSize: '0.875rem', outline: 'none',
                }}
              />
            </div>
          ))}

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Provider
            </label>
            <select
              value={form.repoProvider}
              onChange={e => setForm(prev => ({ ...prev, repoProvider: e.target.value as 'github' | 'gitlab' }))}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', padding: '0.6rem 0.875rem',
                fontSize: '0.875rem', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Risk Threshold (0–100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.riskThreshold}
              onChange={e => setForm(prev => ({ ...prev, riskThreshold: e.target.value }))}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', padding: '0.6rem 0.875rem',
                fontSize: '0.875rem', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--accent-red)', fontSize: '0.875rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div className="flex items-center gap-3" style={{ marginTop: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              {loading ? (
                <><Clock size={14} className="animate-spin" /> Connecting…</>
              ) : (
                <><Plus size={14} /> Connect Repo</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await getProjects('default-org');
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filtered = projects.filter(
    p => p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.repoUrl.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: projects.length,
    active: projects.length,
    riskAvg: projects.length > 0
      ? Math.round(projects.reduce((a, p) => a + p.riskThreshold, 0) / projects.length)
      : 0,
  };

  return (
    <div className="animate-fade-in">
      {showModal && (
        <ConnectRepoModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchProjects}
        />
      )}

      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Folder size={24} className="text-purple-400" /> Projects
          </h1>
          <p className="page-subtitle">Manage connected repositories and pipeline configurations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn btn-primary"
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            onClick={() => setShowModal(true)}
          >
            <Plus size={16} /> Connect Repo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
        {[
          { label: 'Total Projects', value: isLoading ? '—' : String(stats.total), icon: <Folder size={18} className="text-purple-400" />, color: 'var(--accent-purple-light)' },
          { label: 'Active', value: isLoading ? '—' : String(stats.active), icon: <RefreshCw size={18} className="text-cyan-500" />, color: 'var(--accent-cyan)' },
          { label: 'Avg Risk Threshold', value: isLoading ? '—' : String(stats.riskAvg), icon: <Zap size={18} className="text-amber-500" />, color: 'var(--accent-yellow)' },
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

      {/* Search + Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
          <h3>Connected Repositories</h3>
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              padding: '0.4rem 0.75rem', fontSize: '0.875rem', outline: 'none', width: 220,
            }}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted text-sm">Loading projects…</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-red)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
              <p>{error}</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <Folder size={40} className="text-muted" />
            </div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              {search ? 'No matching projects' : 'No projects yet'}
            </p>
            <p className="text-muted text-sm">
              {search ? 'Clear your search to see all projects.' : 'Click "Connect Repo" to add your first GitHub repository.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Repository</th>
                  <th>Branch</th>
                  <th>Provider</th>
                  <th>Risk Threshold</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                    <td>
                      <a
                        href={p.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}
                      >
                        {p.repoUrl.replace('https://', '').replace('http://', '')}
                      </a>
                    </td>
                    <td>
                      <code className="font-mono text-xs" style={{ color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                        {p.defaultBranch}
                      </code>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                        {p.repoProvider === 'github' ? (
                          <><Github size={12} /> GitHub</>
                        ) : (
                          <><Gitlab size={12} /> GitLab</>
                        )}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 700, fontFamily: 'monospace',
                        color: p.riskThreshold >= 80 ? 'var(--accent-red)' : p.riskThreshold >= 60 ? 'var(--accent-yellow)' : 'var(--accent-green)',
                      }}>
                        {p.riskThreshold}
                      </span>
                    </td>
                    <td className="text-xs text-muted">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Settings size={12} /> Settings
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
