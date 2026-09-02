'use client';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { getPolicies, createPolicy, updatePolicy, deletePolicy, togglePolicy, Policy } from '@/lib/api';
import { Shield, Plus, CheckCircle2, FileText, Trash2, Edit2, ShieldAlert, ShieldCheck, ShieldOff, MinusCircle, Clock, AlertTriangle } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import PermissionGate from '@/components/PermissionGate';
import AccessDenied from '@/components/AccessDenied';

interface RuleState {
  field: string;
  operator: string;
  value: string;
}

function PolicyModal({ onClose, onSuccess, policy }: { onClose: () => void; onSuccess: () => void; policy?: Policy }) {
  const orgId = useOrganizationId();
  const [form, setForm] = useState({
    name: policy?.name ?? '',
    description: policy?.description ?? '',
    action: policy?.action ?? 'blocked',
    priority: policy ? String(policy.priority) : '80',
  });

  const [rules, setRules] = useState<RuleState[]>(
    policy
      ? policy.rules.map(r => ({ field: r.field, operator: r.operator, value: String(r.value) }))
      : [{ field: 'overall_risk', operator: 'gt', value: '70' }]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addRule = () => {
    setRules(prev => [...prev, { field: 'overall_risk', operator: 'gt', value: '70' }]);
  };

  const removeRule = (idx: number) => {
    if (rules.length === 1) return;
    setRules(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRuleChange = (idx: number, key: keyof RuleState, val: string) => {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rules.length === 0) {
      setError('Please add at least one rule condition.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        organizationId: orgId,
        name: form.name,
        description: form.description,
        action: form.action as Policy['action'],
        priority: parseInt(form.priority),
        enabled: policy ? policy.enabled : true,
        rules: rules.map(r => ({
          field: r.field,
          operator: r.operator as any,
          value: parseInt(r.value) || 0
        })),
      };

      if (policy) {
        await updatePolicy(policy.id, payload);
      } else {
        await createPolicy(payload);
      }
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 540 }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Shield size={18} className="text-purple-400" /> {policy ? 'Edit Policy' : 'New Policy'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem' }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Policy Name</label>
            <input
              type="text" required placeholder="e.g. Block Critical Security Issues"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0.6rem 0.875rem', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Description</label>
            <input
              type="text" placeholder="What does this policy do?"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0.6rem 0.875rem', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Action</label>
              <select
                value={form.action} onChange={e => setForm(p => ({ ...p, action: e.target.value as any }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0.6rem 0.875rem', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="blocked">Block</option>
                <option value="needs_review">Require Review</option>
                <option value="approved">Auto-approve</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Priority</label>
              <input
                type="number" min="1" max="100" value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0.6rem 0.875rem', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="text-xs text-muted flex items-center justify-between" style={{ letterSpacing: '0.05em', fontWeight: 600 }}>
              <span>RULE CONDITIONS (AND LOGIC)</span>
              <button type="button" className="btn btn-secondary" onClick={addRule} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(124,58,237,0.15)', color: 'var(--accent-purple-light)' }}>+ Add Rule</button>
            </div>
            
            {rules.map((rule, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto 80px auto', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={rule.field} onChange={e => handleRuleChange(idx, 'field', e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0.4rem', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="overall_risk">Overall Risk Score</option>
                  <option value="security_risk">Security Risk</option>
                  <option value="quality_risk">Quality Risk</option>
                  <option value="critical_issues">Critical Issues</option>
                  <option value="high_issues">High Issues</option>
                </select>
                <select
                  value={rule.operator} onChange={e => handleRuleChange(idx, 'operator', e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0.4rem', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="gt">&gt;</option>
                  <option value="gte">≥</option>
                  <option value="lt">&lt;</option>
                  <option value="lte">≤</option>
                  <option value="eq">=</option>
                </select>
                <input
                  type="number" min="0" max="100" value={rule.value}
                  onChange={e => handleRuleChange(idx, 'value', e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0.4rem', fontSize: '0.8125rem', outline: 'none', textAlign: 'center', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => removeRule(idx)}
                  disabled={rules.length === 1}
                  style={{ background: 'none', border: 'none', cursor: rules.length === 1 ? 'not-allowed' : 'pointer', color: 'var(--accent-red)', fontSize: '0.9rem', padding: '0 0.25rem', opacity: rules.length === 1 ? 0.3 : 0.8 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ color: 'var(--accent-red)', fontSize: '0.875rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}

          <div className="flex items-center gap-3" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              {loading ? (
                <><Clock size={14} className="animate-spin" /> Saving…</>
              ) : (
                <><ShieldCheck size={14} /> {policy ? 'Save Policy' : 'Create Policy'}</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function PoliciesPage() {
  const orgId = useOrganizationId();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      const data = await getPolicies(orgId);
      setPolicies(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this policy?')) return;
    setDeletingId(id);
    try {
      await deletePolicy(id);
      await fetchPolicies();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      await togglePolicy(id);
      await fetchPolicies();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  const stats = {
    active: policies.filter(p => p.enabled).length,
    total: policies.length,
    rules: policies.reduce((a, p) => a + p.rules.length, 0),
  };

  return (
    <PermissionGate require="policy:read" fallback={<AccessDenied message="You don't have permission to view pipeline governance policies." requiredPermission="policy:read" />}>
    <div className="animate-fade-in">
      {showModal && (
        <PolicyModal
          policy={editingPolicy || undefined}
          onClose={() => {
            setShowModal(false);
            setEditingPolicy(null);
          }}
          onSuccess={fetchPolicies}
        />
      )}

      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={24} className="text-purple-400" /> Pipeline Governance
          </h1>
          <p className="page-subtitle">AI-driven policy rules, risk thresholds, and deployment gates</p>
        </div>
        <PermissionGate require="policy:write">
          <button
            className="btn btn-primary"
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            onClick={() => {
              setEditingPolicy(null);
              setShowModal(true);
            }}
          >
            <Plus size={16} /> New Policy
          </button>
        </PermissionGate>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
        {[
          { label: 'Active Policies', value: isLoading ? '—' : String(stats.active), icon: <ShieldCheck size={18} className="text-emerald-500" />, color: 'var(--accent-green)' },
          { label: 'Total Rules', value: isLoading ? '—' : String(stats.rules), icon: <FileText size={18} className="text-purple-400" />, color: 'var(--accent-purple-light)' },
          { label: 'Total Policies', value: isLoading ? '—' : String(stats.total), icon: <Shield size={18} className="text-blue-500" />, color: 'var(--accent-blue)' },
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

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Enforced Policies</h3>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted text-sm">Loading policies…</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        ) : policies.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <Shield size={40} className="text-muted" />
            </div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No policies yet</p>
            <p className="text-muted text-sm">Create a policy to start governing your pipelines.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Policy Name</th>
                  <th>Description</th>
                  <th>Rules</th>
                  <th>Priority</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} style={{ opacity: p.enabled ? 1 : 0.55 }}>
                    <td><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                    <td className="text-muted text-sm">{p.description ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {p.rules.map((r, ri) => (
                          <code key={ri} style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
                            {r.field.replace('_', ' ')} {r.operator} {r.value}
                          </code>
                        ))}
                      </div>
                    </td>
                    <td className="font-mono text-xs text-muted">{p.priority}</td>
                    <td>
                      {p.action === 'blocked' && (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <ShieldOff size={12} /> Block
                        </span>
                      )}
                      {p.action === 'needs_review' && (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <ShieldAlert size={12} /> Review
                        </span>
                      )}
                      {p.action === 'approved' && (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <ShieldCheck size={12} /> Auto-approve
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggle(p.id)}
                        disabled={togglingId === p.id}
                        style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}
                      >
                        <span className={p.enabled ? 'badge badge-success' : 'badge-neutral'} style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {togglingId === p.id ? (
                            <><Clock size={10} className="animate-spin" /> Updating</>
                          ) : p.enabled ? (
                            <><CheckCircle2 size={10} /> Active</>
                          ) : (
                            <><MinusCircle size={10} /> Disabled</>
                          )}
                        </span>
                      </button>
                    </td>
                    <td>
                      <PermissionGate require="policy:write">
                        <div className="flex items-center gap-2">
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem' }}
                            onClick={() => {
                              setEditingPolicy(p);
                              setShowModal(true);
                            }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem' }}
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                          >
                            {deletingId === p.id ? <Clock size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </PermissionGate>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </PermissionGate>
  );
}
