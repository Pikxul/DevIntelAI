'use client';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { getTeamMembers, getAuditLogs, getApprovalRequests, updateMemberRole, approveRequest, rejectRequest, TeamMember, AuditLog, ApprovalRequest, getToken } from '@/lib/api';
import { Building2, Crown, Shield, Code2, Eye, Users, Lock, FileText, Check, X, Clock, AlertTriangle, Download, FileDown } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';

const roles = ['owner', 'admin', 'manager', 'security_engineer', 'developer', 'viewer'];
const roleColors: Record<string, string> = {
  owner: 'badge-danger',
  admin: 'badge-danger',
  manager: 'badge-warning',
  security_engineer: 'badge-info',
  developer: 'badge-info',
  viewer: 'badge-neutral',
};
const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown size={12} className="inline mr-1" />,
  admin: <Crown size={12} className="inline mr-1" />,
  manager: <Shield size={12} className="inline mr-1" />,
  security_engineer: <Shield size={12} className="inline mr-1" />,
  developer: <Code2 size={12} className="inline mr-1" />,
  viewer: <Eye size={12} className="inline mr-1" />,
};

type TabId = 'members' | 'audit' | 'approvals';

function TabButton({ id, active, children, onClick }: { id: TabId; active: boolean; children: React.ReactNode; onClick: (id: TabId) => void }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
        border: 'none', transition: 'all 0.15s',
        background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
        color: active ? 'var(--accent-purple-light)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}

function MembersTab() {
  const orgId = useOrganizationId();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    getTeamMembers(orgId)
      .then(setMembers)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [orgId]);

  const handleRoleChange = async (memberId: string, newRole: any) => {
    setUpdatingId(memberId);
    try {
      const updated = await updateMemberRole(memberId, newRole as any);
      setMembers(prev => prev.map(m => m.id === memberId ? updated : m));
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) return <div className="text-muted text-sm" style={{ padding: '3rem', textAlign: 'center' }}>Loading members…</div>;
  if (error) return <div style={{ color: 'var(--accent-red)', padding: '2rem', textAlign: 'center' }}>⚠️ {error}<br /><span className="text-xs text-muted">Governance endpoints coming soon — check API server is running.</span></div>;
  if (members.length === 0) return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <Users size={40} className="text-muted" />
      </div>
      <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No team members yet</p>
      <p className="text-muted text-sm">Members will appear here once users join your organization.</p>
    </div>
  );

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
              <td>
                <div className="flex items-center gap-2">
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt={m.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.name}</span>
                </div>
              </td>
              <td className="text-sm text-muted">{m.email}</td>
              <td>
                <span className={`badge ${roleColors[m.role] ?? 'badge-neutral'}`}>
                  {roleIcons[m.role]} {m.role.replace('_', ' ')}
                </span>
              </td>
              <td className="text-xs text-muted">{new Date(m.createdAt).toLocaleDateString()}</td>
              <td>
                <select
                  value={m.role}
                  onChange={e => handleRoleChange(m.id, e.target.value as TeamMember['role'])}
                  disabled={updatingId === m.id}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                    padding: '0.3rem 0.6rem', fontSize: '0.8125rem', outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab() {
  const orgId = useOrganizationId();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    getAuditLogs(orgId, 100)
      .then(setLogs)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [orgId]);

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/v1/governance/audit-logs/export?organizationId=${orgId}&format=${format}`, {
        headers,
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${orgId}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.resource.toLowerCase().includes(filter.toLowerCase()) ||
    l.userEmail.toLowerCase().includes(filter.toLowerCase())
  );

  if (isLoading) return <div className="text-muted text-sm" style={{ padding: '3rem', textAlign: 'center' }}>Loading audit logs…</div>;
  if (error) return <div style={{ color: 'var(--accent-red)', padding: '2rem', textAlign: 'center' }}>⚠️ {error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        <input
          type="text"
          placeholder="Filter by action, resource, or user…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
            padding: '0.5rem 0.875rem', fontSize: '0.875rem', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
            onClick={() => handleExport('json')}
            disabled={isExporting}
          >
            <FileDown size={14} /> Export JSON
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <FileText size={40} className="text-muted" />
          </div>
          <p style={{ fontWeight: 600 }}>No audit logs</p>
          <p className="text-muted text-sm">Actions across the platform will be logged here automatically.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td className="text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="text-sm">{log.userEmail}</td>
                  <td>
                    <code style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                      {log.action}
                    </code>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{log.resource}</span>
                  </td>
                  <td className="text-xs text-muted">{log.details ?? '—'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ApprovalsTab() {
  const orgId = useOrganizationId();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await getApprovalRequests(orgId);
      setRequests(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      await approveRequest(id, 'Approved via governance dashboard');
      await fetchRequests();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    setActionId(id);
    try {
      await rejectRequest(id, reason);
      await fetchRequests();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setActionId(null);
    }
  };

  if (isLoading) return <div className="text-muted text-sm" style={{ padding: '3rem', textAlign: 'center' }}>Loading approval requests…</div>;
  if (error) return <div style={{ color: 'var(--accent-red)', padding: '2rem', textAlign: 'center' }}>⚠️ {error}</div>;
  if (requests.length === 0) return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <Lock size={40} className="text-muted" />
      </div>
      <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No pending approvals</p>
      <p className="text-muted text-sm">High-risk pipelines requiring manual review will appear here.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {requests.map((req, i) => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          style={{
            padding: '1.25rem',
            background: req.status === 'pending' ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${req.status === 'pending' ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code style={{ color: 'var(--accent-cyan)', fontSize: '0.875rem' }}>{req.pipelineRunId.slice(0, 8)}</code>
              <span className={`badge ${req.status === 'pending' ? 'badge-warning' : req.status === 'approved' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                {req.status}
              </span>
            </div>
            <p className="text-xs text-muted">
              Requested by {req.requestedBy} · {new Date(req.createdAt).toLocaleString()}
              {req.reviewedBy && ` · Reviewed by ${req.reviewedBy}`}
              {req.reason && ` · "${req.reason}"`}
            </p>
          </div>
          {req.status === 'pending' && (
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => handleApprove(req.id)}
                disabled={actionId === req.id}
              >
                {actionId === req.id ? <Clock size={12} className="animate-spin" /> : <Check size={12} />} Approve
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => handleReject(req.id)}
                disabled={actionId === req.id}
              >
                {actionId === req.id ? <Clock size={12} className="animate-spin" /> : <X size={12} />} Reject
              </button>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('members');

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={24} className="text-purple-400" /> Governance
          </h1>
          <p className="page-subtitle">RBAC management, audit logs, and deployment approval workflows</p>
        </div>
        <span className="badge badge-purple">Enterprise</span>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
        {[
          { label: 'RBAC Control', value: 'Active', icon: <Crown size={18} className="text-emerald-500" />, color: 'var(--accent-green)', desc: '4 roles configured' },
          { label: 'Audit Logging', value: 'Enabled', icon: <FileText size={18} className="text-blue-500" />, color: 'var(--accent-blue)', desc: 'All actions tracked' },
          { label: 'Approval Gate', value: 'Enabled', icon: <Lock size={18} className="text-purple-400" />, color: 'var(--accent-purple-light)', desc: 'High-risk pipelines require review' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">{s.label}</span>
              {s.icon}
            </div>
            <div className="stat-value" style={{ color: s.color, fontSize: '1.25rem' }}>{s.value}</div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>{s.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <TabButton id="members" active={activeTab === 'members'} onClick={setActiveTab}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><Users size={14} /> Team Members</span>
          </TabButton>
          <TabButton id="approvals" active={activeTab === 'approvals'} onClick={setActiveTab}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><Lock size={14} /> Approvals</span>
          </TabButton>
          <TabButton id="audit" active={activeTab === 'audit'} onClick={setActiveTab}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><FileText size={14} /> Audit Log</span>
          </TabButton>
        </div>

        {activeTab === 'members' && <MembersTab />}
        {activeTab === 'approvals' && <ApprovalsTab />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
