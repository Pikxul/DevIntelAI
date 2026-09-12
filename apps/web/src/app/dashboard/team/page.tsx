'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Shield, Crown, Wrench, Code, Eye, BarChart3, AlertTriangle, Lock,
  MoreVertical, Search, Loader2, CheckCircle2, XCircle, Copy, RefreshCw,
  ChevronDown, Mail, UserCog
} from 'lucide-react';
import { ROLE_LABELS, ROLE_BADGE_COLORS } from '@/lib/permissions';
import { isManagementRole } from '@/lib/RoleUIRegistry';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  firstLogin: boolean;
  avatarUrl?: string;
  createdAt: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown size={14} />,
  admin: <Shield size={14} />,
  devops_engineer: <Wrench size={14} />,
  sre_engineer: <AlertTriangle size={14} />,
  security_engineer: <Lock size={14} />,
  developer: <Code size={14} />,
  analyst: <BarChart3 size={14} />,
  viewer: <Eye size={14} />,
};

const ASSIGNABLE_ROLES = ['admin', 'devops_engineer', 'sre_engineer', 'security_engineer', 'developer', 'analyst', 'viewer'];

export default function TeamPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const orgId = (session as any)?.organizationId;
  const token = (session as any)?.accessToken;
  const currentRole = (session as any)?.role;

  const fetchMembers = useCallback(async () => {
    if (!orgId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load team');
      const data = await res.json();
      setMembers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId, token]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusToggle = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/members/${memberId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update status');
      }
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, status: newStatus } : m));
    } catch (err: any) {
      alert(err.message);
    }
    setActionMenuId(null);
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update role');
      }
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err: any) {
      alert(err.message);
    }
    setActionMenuId(null);
  };

  const canManage = isManagementRole(currentRole);

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} />
            Team Management
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {members.length} member{members.length !== 1 ? 's' : ''} in your organization
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchMembers}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1rem', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '8px',
                background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none',
                color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              }}
            >
              <UserPlus size={16} /> Add Member
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
          <Loader2 size={24} className="auth-spinner" />
        </div>
      ) : (
        /* Members Table */
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={thStyle}>Member</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Joined</th>
                {canManage && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
                          {member.name}
                          {member.firstLogin && (
                            <span style={{
                              marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.4rem',
                              background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: '4px',
                            }}>
                              Pending
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {canManage && member.role !== 'owner' ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        style={{
                          padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                          color: '#fff', fontSize: '0.8rem', cursor: 'pointer', outline: 'none',
                        }}
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r} style={{ background: '#1a1a2e' }}>
                            {ROLE_LABELS[r] || r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem',
                        background: member.role === 'owner' ? 'rgba(245,158,11,0.12)' : 'rgba(129,140,248,0.12)',
                        color: member.role === 'owner' ? '#f59e0b' : '#818cf8',
                      }}>
                        {ROLE_ICONS[member.role]} {ROLE_LABELS[member.role] || member.role}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem',
                      background: member.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      color: member.status === 'active' ? '#10b981' : '#ef4444',
                    }}>
                      {member.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {member.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  {canManage && (
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {member.role !== 'owner' && (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            onClick={() => setActionMenuId(actionMenuId === member.id ? null : member.id)}
                            style={{
                              padding: '0.3rem', background: 'none', border: 'none',
                              color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {actionMenuId === member.id && (
                            <div style={{
                              position: 'absolute', right: 0, top: '100%', zIndex: 50,
                              background: '#1e1e36', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px', padding: '0.25rem', minWidth: '160px',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            }}>
                              <button
                                onClick={() => handleStatusToggle(member.id, member.status)}
                                style={menuBtnStyle}
                              >
                                {member.status === 'active' ? (
                                  <><XCircle size={14} /> Deactivate</>
                                ) : (
                                  <><CheckCircle2 size={14} /> Activate</>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 5 : 4} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem' }}>
                    {search ? 'No members match your search' : 'No team members yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddModal && <AddMemberModal orgId={orgId} token={token} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchMembers(); }} />}
      </AnimatePresence>
    </div>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────────────── */

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem',
  fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', fontSize: '0.85rem',
};

const menuBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
  padding: '0.5rem 0.75rem', background: 'none', border: 'none',
  color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', cursor: 'pointer',
  borderRadius: '6px', textAlign: 'left',
};

/* ─── Add Member Modal ─────────────────────────────────────────────────────── */

function AddMemberModal({ orgId, token, onClose, onSuccess }: {
  orgId: string; token: string; onClose: () => void; onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email: email.toLowerCase().trim(), role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create member');
      }

      const data = await res.json();
      setResult({ email: data.member.email, temporaryPassword: data.temporaryPassword });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`Email: ${result.email}\nTemporary Password: ${result.temporaryPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px', padding: '1.5rem', maxWidth: '450px', width: '90%',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        {result ? (
          /* Success — show credentials */
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Member Created!
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Share these credentials with the new team member:
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '1rem',
              textAlign: 'left', fontSize: '0.85rem', marginBottom: '1rem',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem' }}>Email</div>
              <div style={{ color: '#fff', fontFamily: 'monospace', marginBottom: '0.75rem' }}>{result.email}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem' }}>Temporary Password</div>
              <div style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600 }}>{result.temporaryPassword}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleCopy} style={{
                flex: 1, padding: '0.6rem', borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', cursor: 'pointer', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
              }}>
                <Copy size={14} /> {copied ? 'Copied!' : 'Copy Credentials'}
              </button>
              <button onClick={onSuccess} style={{
                flex: 1, padding: '0.6rem', borderRadius: '8px',
                background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none',
                color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              }}>
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} /> Add Team Member
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              A temporary password will be generated automatically
            </p>

            {error && (
              <div style={{
                padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '0.75rem',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r} style={{ background: '#1a1a2e' }}>
                      {ROLE_LABELS[r] || r}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={onClose} style={{
                  flex: 1, padding: '0.6rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.85rem',
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={{
                  flex: 1, padding: '0.6rem', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none',
                  color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                }}>
                  {loading ? <><Loader2 size={14} className="auth-spinner" /> Creating...</> : <><UserPlus size={14} /> Create Member</>}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem',
  fontWeight: 500, marginBottom: '0.3rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none',
};
