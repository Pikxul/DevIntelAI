'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import {
  getTeamMembers,
  getAuditLogs,
  getApprovalRequests,
  getPendingInvitations,
  inviteTeamMember,
  cancelInvitation,
  updateMemberRole,
  approveRequest,
  rejectRequest,
  TeamMember,
  Invitation,
  AuditLog,
  ApprovalRequest,
  getToken
} from '@/lib/api';
import {
  Building2,
  Crown,
  Shield,
  Code2,
  Eye,
  Users,
  Lock,
  FileText,
  Check,
  X,
  Clock,
  AlertTriangle,
  Download,
  FileDown,
  UserPlus,
  Mail,
  Trash2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import PermissionGate from '@/components/PermissionGate';
import { useToast } from '@/components/Toast';

const roles = ['owner', 'admin', 'devops_engineer', 'sre_engineer', 'security_engineer', 'developer', 'viewer'] as const;

const roleColors: Record<string, string> = {
  owner: 'badge-danger',
  admin: 'badge-warning',
  devops_engineer: 'badge-info',
  sre_engineer: 'badge-info',
  security_engineer: 'badge-success',
  developer: 'badge-neutral',
  viewer: 'badge-neutral',
};

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown size={12} className="inline mr-1" />,
  admin: <Crown size={12} className="inline mr-1" />,
  devops_engineer: <Code2 size={12} className="inline mr-1" />,
  sre_engineer: <Shield size={12} className="inline mr-1" />,
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

function InviteMemberModal({
  isOpen,
  onClose,
  onSuccess,
  orgId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgId: string;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('developer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await inviteTeamMember(orgId, { email, role });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setEmail('');
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <UserPlus size={18} className="text-purple-400" /> Invite Team Member
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={36} color="#10b981" />
            <p style={{ fontWeight: 600, color: 'var(--accent-green)', margin: 0 }}>Invitation Sent!</p>
            <p className="text-xs text-muted" style={{ margin: 0 }}>The member can now sign in using {email}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                Employee Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.875rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alice@acme.com"
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    paddingLeft: '2.5rem',
                    paddingRight: '1rem',
                    paddingTop: '0.625rem',
                    paddingBottom: '0.625rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                Enterprise Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.625rem 0.875rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                <option value="admin">Admin (Engineering Manager / Lead)</option>
                <option value="devops_engineer">DevOps Engineer (Platform Engineer)</option>
                <option value="sre_engineer">SRE Engineer (Reliability Engineer)</option>
                <option value="security_engineer">Security Engineer (Security Specialist)</option>
                <option value="developer">Developer (Software Engineer)</option>
                <option value="viewer">Viewer / Executive (CTO Dashboard Access)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email}
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function MembersTab() {
  const orgId = useOrganizationId();
  const { showToast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const loadData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      getTeamMembers(orgId),
      getPendingInvitations(orgId).catch(() => []),
    ])
      .then(([m, inv]) => {
        setMembers(m);
        setInvitations(inv);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (memberId: string, newRole: any) => {
    setUpdatingId(memberId);
    try {
      const updated = await updateMemberRole(memberId, newRole as any);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await cancelInvitation(orgId, invitationId);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch (err: any) {
      showToast(`Failed to revoke invitation: ${err.message}`, 'error');
    }
  };

  if (isLoading) return <div className="text-muted text-sm" style={{ padding: '3rem', textAlign: 'center' }}>Loading members…</div>;
  if (error) return <div style={{ color: 'var(--accent-red)', padding: '2rem', textAlign: 'center' }}>⚠️ {error}</div>;

  return (
    <div>
      {/* Header with Invite Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Active Team Members</h3>
          <p className="text-xs text-muted" style={{ margin: '0.25rem 0 0 0' }}>Manage access roles across the organization</p>
        </div>
        <PermissionGate require="user:invite">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <UserPlus size={14} /> Invite Member
          </button>
        </PermissionGate>
      </div>

      <div className="table-container" style={{ marginBottom: '2rem' }}>
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
                    {roleIcons[m.role]} {m.role.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="text-xs text-muted">{new Date(m.createdAt).toLocaleDateString()}</td>
                <td>
                  <PermissionGate
                    require="user:assign_role"
                    fallback={
                      <span className={`badge ${roleColors[m.role] ?? 'badge-neutral'}`} style={{ fontSize: '0.75rem' }}>
                        {roleIcons[m.role]} {m.role.replace(/_/g, ' ')}
                      </span>
                    }
                  >
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as TeamMember['role'])}
                      disabled={updatingId === m.id}
                      style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                        padding: '0.3rem 0.6rem', fontSize: '0.8125rem', outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </PermissionGate>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} className="text-amber-400" /> Pending Invitations ({invitations.length})
            </h4>
            <p className="text-xs text-muted" style={{ margin: '0.25rem 0 0 0' }}>Invited members who have not completed initial sign-in</p>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invited Email</th>
                  <th>Assigned Role</th>
                  <th>Invited By</th>
                  <th>Sent Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{inv.email}</td>
                    <td>
                      <span className={`badge ${roleColors[inv.role] ?? 'badge-neutral'}`}>
                        {roleIcons[inv.role]} {inv.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="text-xs text-muted">{inv.invitedBy}</td>
                    <td className="text-xs text-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td>
                      <PermissionGate require="user:invite">
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.2)', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          title="Revoke Invitation"
                        >
                          <Trash2 size={12} className="inline mr-1" /> Revoke
                        </button>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={loadData}
        orgId={orgId}
      />
    </div>
  );
}

function AuditTab() {
  const orgId = useOrganizationId();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    getAuditLogs(orgId, 100)
      .then(setLogs)
      .catch((e) => setError(e.message))
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
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredLogs = logs.filter((l) =>
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.userEmail.toLowerCase().includes(filter.toLowerCase()) ||
    l.resource.toLowerCase().includes(filter.toLowerCase()) ||
    (l.details || '').toLowerCase().includes(filter.toLowerCase())
  );

  if (isLoading) return <div className="text-muted text-sm" style={{ padding: '3rem', textAlign: 'center' }}>Loading audit logs…</div>;
  if (error) return <div style={{ color: 'var(--accent-red)', padding: '2rem', textAlign: 'center' }}>⚠️ {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Filter audit logs by action, user, or resource…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
          style={{ maxWidth: 360 }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting || logs.length === 0}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting || logs.length === 0}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <FileDown size={14} /> Export JSON
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((l, i) => (
              <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <td className="text-xs text-muted font-mono">{new Date(l.createdAt).toLocaleString()}</td>
                <td>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{l.userEmail}</span>
                </td>
                <td>
                  <span className="badge badge-info font-mono text-xs">{l.action}</span>
                </td>
                <td className="text-sm font-mono text-muted">{l.resource}</td>
                <td className="text-sm text-secondary" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.details || '—'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApprovalsTab() {
  const orgId = useOrganizationId();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadRequests = useCallback(() => {
    getApprovalRequests(orgId)
      .then(setRequests)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [orgId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveRequest(id);
      loadRequests();
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    setActionLoading(id);
    try {
      await rejectRequest(id, reason);
      loadRequests();
    } catch (err: any) {
      showToast(`Rejection failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) return <div className="text-muted text-sm" style={{ padding: '3rem', textAlign: 'center' }}>Loading approval requests…</div>;
  if (error) return <div style={{ color: 'var(--accent-red)', padding: '2rem', textAlign: 'center' }}>⚠️ {error}</div>;
  if (requests.length === 0) return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <Check size={40} className="text-muted" style={{ margin: '0 auto 1rem' }} />
      <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No pending approval requests</p>
      <p className="text-muted text-sm">Deployments exceeding risk thresholds will require manager approval here.</p>
    </div>
  );

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Pipeline Run</th>
            <th>Requested By</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td className="font-mono text-sm">{r.pipelineRunId.slice(0, 8)}</td>
              <td className="text-sm font-semibold">{r.requestedBy}</td>
              <td>
                <span className={`badge ${r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                  {r.status}
                </span>
              </td>
              <td className="text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</td>
              <td>
                {r.status === 'pending' ? (
                  <PermissionGate require="approval:review">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={actionLoading === r.id}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        <Check size={12} className="inline mr-1" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={actionLoading === r.id}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', color: '#f87171' }}
                      >
                        <X size={12} className="inline mr-1" /> Reject
                      </button>
                    </div>
                  </PermissionGate>
                ) : (
                  <span className="text-xs text-muted">{r.reviewedBy ? `Reviewed by ${r.reviewedBy}` : 'Completed'}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
          { label: 'RBAC Control', value: 'Active', icon: <Crown size={18} className="text-emerald-500" />, color: 'var(--accent-green)', desc: '7 canonical roles' },
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
        {activeTab === 'audit' && (
          <PermissionGate
            require="audit_log:view"
            fallback={
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Lock size={32} style={{ opacity: 0.5, margin: '0 auto 0.75rem' }} />
                <p style={{ fontWeight: 600 }}>Audit log access restricted</p>
                <p className="text-sm" style={{ marginTop: '0.25rem' }}>Contact your Organization Owner or Admin for audit log access.</p>
              </div>
            }
          >
            <AuditTab />
          </PermissionGate>
        )}
      </div>
    </div>
  );
}
