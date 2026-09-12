'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Settings, Bot, Link2, Sliders, Bell, CheckCircle, XCircle, Users, ArrowRight, UserPlus, Mail, Shield, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import PermissionGate from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { inviteTeamMember } from '@/lib/api';

interface SettingRow {
  key: string;
  label: string;
  description: string;
  type: 'toggle' | 'select' | 'input';
  value: string | boolean;
  options?: string[];
}

export default function SettingsPage() {
  const { can } = usePermissions();
  const canEdit = can('org:settings');
  const orgId = useOrganizationId() || 'acme-corp';
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('devops_engineer');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    try {
      await inviteTeamMember(orgId, { email: inviteEmail, role: inviteRole });
      setInviteSuccess(true);
      setTimeout(() => {
        setInviteSuccess(false);
        setShowInviteModal(false);
        setInviteEmail('');
      }, 1500);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const [settings, setSettings] = useState<SettingRow[]>([
    { key: 'ai_provider', label: 'Primary AI Provider', description: 'The default provider used for code reviews and anomaly detection.', type: 'select', value: 'Gemini 2.0 Flash', options: ['Gemini 2.0 Flash', 'Claude 3.5 Sonnet', 'GPT-4o'] },
    { key: 'risk_threshold', label: 'Pipeline Block Threshold', description: 'Block a pipeline if the AI risk score exceeds this value (0–100).', type: 'input', value: '70' },
    { key: 'auto_rollback', label: 'Auto-Rollback on Anomaly', description: 'Automatically trigger a rollback when a critical production anomaly is detected.', type: 'toggle', value: true },
    { key: 'slack_notify', label: 'Slack Notifications', description: 'Send pipeline and incident alerts to a Slack channel.', type: 'toggle', value: false },
    { key: 'github_webhook', label: 'GitHub Webhook Events', description: 'Trigger AI review on push and pull_request events.', type: 'toggle', value: true },
    { key: 'pr_summary', label: 'Auto PR Summaries', description: 'Automatically post an AI-generated summary as a PR comment on GitHub.', type: 'toggle', value: true },
    { key: 'anomaly_sensitivity', label: 'Anomaly Sensitivity', description: 'Set how aggressively anomalies are detected from production metrics.', type: 'select', value: 'Medium', options: ['Low', 'Medium', 'High', 'Critical-only'] },
    { key: 'retention', label: 'Pipeline Log Retention (days)', description: 'How long to retain pipeline run logs and AI review artifacts.', type: 'input', value: '90' },
  ]);

  const update = (key: string, val: string | boolean) =>
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value: val } : s));

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={24} className="text-purple-400" /> Settings
          </h1>
          <p className="page-subtitle">Platform configuration, AI model preferences, and integrations</p>
        </div>
        <PermissionGate require="org:settings">
          <button className="btn btn-primary">Save Changes</button>
        </PermissionGate>
      </div>

      {/* Read-only notice for non-owners */}
      {!canEdit && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            fontSize: '0.875rem',
            color: 'var(--accent-yellow)',
          }}
        >
          <Settings size={16} />
          <span>Settings are <strong>read-only</strong>. Only the Organization Owner can modify platform settings.</span>
        </div>
      )}

      {/* AI Configuration */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={18} className="text-purple-400" /> AI Configuration
        </h3>
        <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>Configure AI providers and risk scoring behavior</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {settings.slice(0, 4).map((s, i) => (
            <SettingItem key={s.key} setting={s} index={i} onUpdate={update} canEdit={canEdit} />
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link2 size={18} className="text-blue-400" /> Integrations
        </h3>
        <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>Connect external services and notification channels</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {settings.slice(4, 6).map((s, i) => (
            <SettingItem key={s.key} setting={s} index={i} onUpdate={update} canEdit={canEdit} />
          ))}
        </div>
      </div>

      {/* Team & Member Invitations */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} className="text-emerald-400" /> Organization Team & Access Control
            </h3>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              Manually invite employees (DevOps, SRE, Security, Developers, Viewers) and manage 7-tier enterprise roles.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <UserPlus size={14} /> Invite Employee
            </button>
            <Link
              href="/dashboard/governance"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              Manage Team & Invites <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Inline Employee Invitation Modal */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '1.5rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <UserPlus size={18} className="text-purple-400" /> Invite Employee
              </h3>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {inviteSuccess ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={36} color="#10b981" />
                <p style={{ fontWeight: 600, color: 'var(--accent-green)', margin: 0 }}>Invitation Dispatched!</p>
                <p className="text-xs text-muted" style={{ margin: 0 }}>Employee can now sign in using {inviteEmail}.</p>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {inviteError && (
                  <div style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={14} /> {inviteError}
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
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
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
                    Enterprise Role (Chapter 2 Canonical Roles)
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
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
                    <option value="devops_engineer">DevOps Engineer — Repos, Pipelines, Deployments</option>
                    <option value="sre_engineer">SRE Engineer — Incidents, Monitoring, Rollbacks</option>
                    <option value="developer">Developer — Code, AI Reviews, PRs</option>
                    <option value="security_engineer">Security Engineer — Policies, Audit Logs, Risk</option>
                    <option value="admin">Admin — Teams, Projects, Approvals</option>
                    <option value="viewer">Viewer — Dashboards & Reports (Read-Only)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading || !inviteEmail}
                    className="btn btn-primary btn-sm"
                  >
                    {inviteLoading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Notification Channels */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={18} className="text-cyan-400" /> Notification Channels
        </h3>
        <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
          Active alert destinations. Configure via environment variables in <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8em' }}>.env</code>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { name: 'Slack', envKey: 'SLACK_BOT_TOKEN or SLACK_WEBHOOK_URL', icon: '💬', color: '#4a154b', border: 'rgba(74,21,75,0.4)' },
            { name: 'MS Teams', envKey: 'TEAMS_WEBHOOK_URL', icon: '🟦', color: '#6264a7', border: 'rgba(98,100,167,0.4)' },
            { name: 'Jira', envKey: 'JIRA_BASE_URL', icon: '🎯', color: '#0052cc', border: 'rgba(0,82,204,0.35)' },
            { name: 'Email (SMTP)', envKey: 'SMTP_HOST', icon: '📧', color: '#059669', border: 'rgba(5,150,105,0.35)' },
          ].map((ch, i) => (
            <motion.div
              key={ch.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                padding: '1rem',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${ch.border}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.25rem' }}>{ch.icon}</span>
                {/* Status: configured indicators are server-side; we show "Set in .env" pattern */}
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 7px',
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  via .env
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ch.name}</div>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {ch.envKey}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Advanced */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={18} className="text-amber-400" /> Advanced
        </h3>
        <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>Anomaly detection tuning and data retention policies</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {settings.slice(6).map((s, i) => (
            <SettingItem key={s.key} setting={s} index={i} onUpdate={update} canEdit={canEdit} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingItem({ setting, index, onUpdate, canEdit }: { setting: SettingRow; index: number; onUpdate: (k: string, v: string | boolean) => void; canEdit: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ flex: 1, paddingRight: '2rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.2rem' }}>{setting.label}</div>
        <div className="text-sm text-muted">{setting.description}</div>
      </div>
      <div>
        {setting.type === 'toggle' && (
          <button
            onClick={() => canEdit && onUpdate(setting.key, !setting.value)}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: canEdit ? 'pointer' : 'not-allowed',
              background: setting.value ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.2s',
              opacity: canEdit ? 1 : 0.6,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: setting.value ? 25 : 3,
              transition: 'left 0.2s',
            }} />
          </button>
        )}
        {setting.type === 'select' && (
          <select
            value={setting.value as string}
            onChange={e => canEdit && onUpdate(setting.key, e.target.value)}
            disabled={!canEdit}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              padding: '0.4rem 0.75rem', fontSize: '0.875rem', outline: 'none',
              cursor: canEdit ? 'pointer' : 'not-allowed',
              minWidth: 180,
              opacity: canEdit ? 1 : 0.6,
            }}
          >
            {setting.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}
        {setting.type === 'input' && (
          <input
            type="text"
            value={setting.value as string}
            onChange={e => canEdit && onUpdate(setting.key, e.target.value)}
            disabled={!canEdit}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              padding: '0.4rem 0.75rem', fontSize: '0.875rem', outline: 'none',
              width: 100, textAlign: 'center',
              cursor: canEdit ? 'text' : 'not-allowed',
              opacity: canEdit ? 1 : 0.6,
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
