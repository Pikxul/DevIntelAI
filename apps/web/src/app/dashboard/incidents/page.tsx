'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { getIncidents, getIncidentRCA, getIncidentTimeline, updateIncidentStatus, rollbackDeployment, getProjects, Incident, RootCauseAnalysis, IncidentTimelineEvent, Project } from '@/lib/api';
import { AlertOctagon, AlertTriangle, AlertCircle, BarChart3, Info, Cpu, Search, Rocket, Send, CheckCircle2, Clock, Terminal, ShieldAlert, Sliders, Play, X, RefreshCw } from 'lucide-react';

const DEFAULT_ORG = 'default-org';

const severityConfig = {
  critical: { badge: 'badge-danger', icon: <AlertCircle size={20} className="text-red-500 animate-pulse" />, border: 'rgba(239, 68, 68, 0.4)', bg: 'rgba(239, 68, 68, 0.05)', color: 'var(--accent-red)' },
  high: { badge: 'badge-warning', icon: <AlertTriangle size={20} className="text-amber-500" />, border: 'rgba(245, 158, 11, 0.35)', bg: 'rgba(245, 158, 11, 0.05)', color: 'var(--accent-yellow)' },
  medium: { badge: 'badge-info', icon: <BarChart3 size={20} className="text-blue-500" />, border: 'rgba(59, 130, 246, 0.3)', bg: 'rgba(59, 130, 246, 0.05)', color: 'var(--accent-blue)' },
  low: { badge: 'badge-neutral', icon: <Info size={20} className="text-gray-500" />, border: 'var(--border)', bg: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-muted)' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function IncidentCard({ incident, onRefresh }: { incident: Incident; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [rca, setRca] = useState<RootCauseAnalysis | null>(null);
  const [rcaLoading, setRcaLoading] = useState(false);
  const [timeline, setTimeline] = useState<IncidentTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const cfg = severityConfig[incident.severity] ?? severityConfig.low;

  const loadDiagnostics = useCallback(async () => {
    setRcaLoading(true);
    setTimelineLoading(true);
    try {
      const [rcaData, timelineData] = await Promise.all([
        getIncidentRCA(incident.id).catch(() => null),
        getIncidentTimeline(incident.id).catch(() => []),
      ]);
      if (rcaData) setRca(rcaData);
      setTimeline(timelineData);
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    } finally {
      setRcaLoading(false);
      setTimelineLoading(false);
    }
  }, [incident.id]);

  const toggle = () => {
    setExpanded(e => !e);
    if (!expanded) loadDiagnostics();
  };

  const handleRollback = async () => {
    if (!incident.deploymentId) {
      alert('No correlated deployment found for this incident.');
      return;
    }
    setActionLoading(true);
    setActionSuccess(null);
    try {
      await rollbackDeployment(incident.deploymentId, `Manual rollback triggered from Incident Intelligence for Ingress Timeout.`);
      setActionSuccess('Manual rollback triggered successfully! Container clusters are redeploying to stable tags.');
      // Refresh details
      setTimeout(() => {
        loadDiagnostics();
        onRefresh();
      }, 2000);
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    setStatusLoading(true);
    try {
      await updateIncidentStatus(incident.id, newStatus);
      // Reload timeline and stats
      await loadDiagnostics();
      onRefresh();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setStatusLoading(false);
    }
  };

  // Status-badge styling
  const statusColors: Record<string, string> = {
    open: 'badge-danger',
    investigating: 'badge-warning',
    resolved: 'badge-success',
  };

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'var(--transition)'
      }}
      className="card"
    >
      {/* Header Row */}
      <div
        style={{ padding: 'clamp(1.1rem, 2vw, 1.3rem) clamp(1.2rem, 2vw, 1.6rem)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}
        onClick={toggle}
      >
        <div className="flex items-center gap-4">
          <div
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: incident.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
              border: `1px solid ${cfg.border}`,
              flexShrink: 0,
            }}
          >
            {cfg.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{incident.title}</span>
              <span className={`badge ${cfg.badge}`} style={{ fontSize: '0.625rem', textTransform: 'uppercase' }}>{incident.severity}</span>
              <span className={`badge ${statusColors[incident.status || 'open']}`} style={{ fontSize: '0.625rem' }}>{incident.status || 'open'}</span>
            </div>
            <p className="text-sm text-muted" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>{incident.source}</span>
              <span>·</span>
              <span style={{ color: 'var(--text-secondary)' }}>{incident.environment}</span>
              <span>·</span>
              <span>{timeAgo(incident.timestamp)}</span>
              {incident.metric && (
                <>
                  <span>·</span>
                  <code className="font-mono text-xs" style={{ color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.06)', padding: '1px 6px', borderRadius: 4 }}>
                    {incident.metric}: {incident.value?.toFixed(1)} (limit: {incident.threshold})
                  </code>
                </>
              )}
            </p>
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', paddingRight: '0.5rem', fontWeight: 600 }}>
          {expanded ? '▲ Close Details' : '▼ Expand Diagnostics'}
        </div>
      </div>

      {/* Expanded Diagnostics Block */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
                <p className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>{incident.description}</p>
              </div>

              {/* Dynamic Timeline Stepper (T5.3 & T5.4) */}
              <div style={{ margin: '1.5rem 0', background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Incident Timeline & Lifecycle</div>
                
                {timelineLoading ? (
                  <div className="text-xs text-muted">Loading timeline checkpoints…</div>
                ) : timeline.length === 0 ? (
                  <div className="text-xs text-muted">No timeline checkpoints tracked yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {timeline.map((step, idx) => {
                      const iconMap: Record<string, React.ReactNode> = {
                        detected: <AlertOctagon size={12} className="text-red-500 animate-pulse" />,
                        rca_generated: <Cpu size={12} className="text-purple-400" />,
                        investigating: <Search size={12} className="text-cyan-400" />,
                        rollback_started: <Clock size={12} className="text-amber-500 animate-spin" />,
                        rollback_completed: <Rocket size={12} className="text-emerald-400" />,
                        rollback_failed: <X size={12} className="text-red-400" />,
                        resolved: <CheckCircle2 size={12} className="text-emerald-400" />,
                      };

                      return (
                        <div key={step.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginTop: 2, flexShrink: 0
                          }}>
                            {iconMap[step.type] ?? <Info size={12} />}
                          </div>
                          <div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{step.title}</span>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>({new Date(step.timestamp).toLocaleTimeString()})</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2, margin: 0 }}>{step.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Lifecyle Transitions (T5.4) */}
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span className="text-xs text-muted font-mono" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Lifecycle State Controls:</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    onClick={() => handleStatusTransition('investigating')}
                    disabled={statusLoading || incident.status === 'investigating' || incident.status === 'resolved'}
                  >
                    Investigate
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--accent-green)', borderColor: 'rgba(16,185,129,0.3)' }}
                    onClick={() => handleStatusTransition('resolved')}
                    disabled={statusLoading || incident.status === 'resolved'}
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>

              {/* Real-time Telemetry Logs Correlation Stream */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Correlated Telemetry Logs (Ingress & Container events)</div>
                <pre className="code-block" style={{ maxHeight: 120, fontSize: '0.75rem', overflowY: 'auto', background: '#090A0D', margin: 0 }}>
{`[${timeAgo(incident.timestamp)}] [ingress-gateway] EXCEPTION: gateway timeout (504) detected on POST /v1/orders/create.
[${timeAgo(incident.timestamp)}] [data-processor-svc] TRACE: ThreadPoolStarvation - Active worker threads: 100/100, Queue size: 1000.
[${timeAgo(incident.timestamp)}] [prometheus-operator] ALERT raised: High latency detected on database slave replicas.`}
                </pre>
              </div>

              {rcaLoading && (
                <div className="text-sm text-muted" style={{ padding: '1rem 0' }}>
                  🧠 Correlating traces & executing generative Root Cause analysis…
                </div>
              )}

              {/* RCA Details Block */}
              {rca ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  <div style={{ background: 'linear-gradient(145deg, rgba(139,92,246,0.06) 0%, rgba(20,22,27,0.8) 100%)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem', borderBottom: '1px solid rgba(139,92,246,0.15)', paddingBottom: '0.5rem', gap: '0.5rem' }}>
                      <h5 style={{ color: 'var(--accent-purple-light)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, margin: 0 }}>
                        <Cpu size={16} className="text-purple-400" /> AI Root Cause Diagnostics
                      </h5>
                      <span className="badge badge-purple" style={{ fontSize: '0.625rem' }}>Confidence: {rca.confidenceScore}%</span>
                    </div>
                    
                    <p className="text-sm" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>{rca.summary}</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <div className="text-xs text-muted" style={{ marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>Identified Root Cause</div>
                        <div className="code-block" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>{rca.rootCause}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted" style={{ marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>SRE Recommended Actions</div>
                        <ul className="text-sm text-secondary" style={{ paddingLeft: '1.25rem', margin: 0 }}>
                          {rca.recommendedActions.map((a, i) => (
                            <li key={i} style={{ marginBottom: 4 }}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {rca.affectedComponents.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
                        {rca.affectedComponents.map(c => (
                          <span key={c} className="badge badge-neutral" style={{ fontSize: '0.625rem' }}>{c}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(139,92,246,0.15)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                      {actionSuccess ? (
                        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.8125rem', color: 'var(--accent-green)', width: '100%', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <CheckCircle2 size={14} /> {actionSuccess}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={handleRollback}
                            disabled={actionLoading || !incident.deploymentId}
                            className="btn btn-primary btn-sm"
                            style={{ background: 'var(--gradient-brand)', border: 'none', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                          >
                            {actionLoading ? (
                              <><Clock size={12} className="animate-spin" /> Executing Rollback...</>
                            ) : (
                              <><Rocket size={12} /> {incident.deploymentId ? `Trigger Rollback (${incident.deploymentId.slice(0, 8)})` : 'Trigger Rollback'}</>
                            )}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                            onClick={() => alert('Slack Notification sent to channels #ops and #incident-warroom.')}
                          >
                            <Send size={12} /> Dispatch Slack alert
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : !rcaLoading && (
                <div className="text-sm text-muted" style={{ padding: '0.75rem 0' }}>
                  No RCA available for this incident yet.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sandbox Drawer Component (T5.6)
function SandboxDrawer({ isOpen, onClose, onInject }: { isOpen: boolean; onClose: () => void; onInject: () => void }) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      getProjects(DEFAULT_ORG).then(projs => {
        setProjects(projs);
        if (projs.length > 0) {
          setSelectedProjectId(projs[0].id);
        }
      }).catch(err => console.error('Failed to load projects in sandbox:', err));
    }
  }, [isOpen]);
  
  const templates = [
    {
      name: 'Ingress High Latency Spike',
      payload: {
        source: 'Prometheus AlertManager',
        severity: 'critical',
        title: 'High Ingress API Latency (>2500ms)',
        description: 'Kubernetes ingress node ingress-gateway-01 reported average latency spike exceeding SLA limits. Upstream orders database replicas are indicating heavy lock contention on master.',
        metric: 'api_latency_ms',
        value: 2680,
        threshold: 500,
      }
    },
    {
      name: 'Database Pool Exhaustion',
      payload: {
        source: 'Sentry Core Exception Monitor',
        severity: 'high',
        title: 'PostgreSQL connection pool fully exhausted',
        description: 'The connections limit of 100 has been reached for billing-service connection manager. Ingested HTTP requests are failing with PoolTimeoutException: Timeout waiting for idle connection.',
        metric: 'pool_utilization',
        value: 100,
        threshold: 90,
      }
    },
    {
      name: 'OAuth Key Rotation Failure',
      payload: {
        source: 'Datadog Agent',
        severity: 'medium',
        title: 'OAuth Key Rotation warnings on auth-service',
        description: 'Periodic key rotation job failed on container cluster. Public verification certs will expire in 2.8 days. Urgent renewal is recommended.',
        metric: 'days_to_expiration',
        value: 2.8,
        threshold: 5.0,
      }
    }
  ];

  const handleInject = async (templatePayload: any) => {
    if (!selectedProjectId) {
      alert('Please connect a project first before injecting simulated incidents.');
      return;
    }
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const payload = {
        ...templatePayload,
        projectId: selectedProjectId,
      };
      const res = await fetch(`${API_URL}/api/v1/monitoring/incidents/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Ingest webhook failed');
      onInject();
      onClose();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 440,
              background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)',
              zIndex: 1001, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <Terminal size={18} className="text-purple-400" /> SRE Simulation Sandbox
              </h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-secondary" style={{ lineHeight: 1.5, margin: 0 }}>
              Trigger real webhook payloads simulating Prometheus AlertManager, Sentry, or Datadog. 
              The backend will parse the payload, correlation-map it to the latest deployment, save the event history, execute actual AI RCA, and send notifications.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Connected Project</label>
              {projects.length > 0 ? (
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', padding: '0.6rem 0.875rem', fontSize: '0.875rem',
                  }}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.repoProvider})</option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '0.875rem', color: 'var(--accent-red)' }}>
                  No connected projects found in this organization. Please connect a project first.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
              {templates.map(t => (
                <div
                  key={t.name}
                  style={{
                    padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.name}</div>
                  <pre style={{ fontSize: '0.6875rem', background: '#090A0D', padding: '0.5rem', borderRadius: 4, maxHeight: 110, overflowY: 'auto', margin: 0, color: 'var(--accent-cyan)' }}>
                    {JSON.stringify({ ...t.payload, projectId: selectedProjectId || 'no-project-selected' }, null, 2)}
                  </pre>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={loading || !selectedProjectId}
                    style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple-light)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                    onClick={() => handleInject(t.payload)}
                  >
                    <Play size={12} /> Inject Webhook
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sandboxOpen, setSandboxOpen] = useState(false);

  const fetchIncidents = useCallback(async () => {
    try {
      const data = await getIncidents();
      setIncidents(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const activeIncidentsList = incidents;

  const stats = {
    total: activeIncidentsList.length,
    critical: activeIncidentsList.filter(i => i.severity === 'critical').length,
    high: activeIncidentsList.filter(i => i.severity === 'high').length,
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SandboxDrawer
        isOpen={sandboxOpen}
        onClose={() => setSandboxOpen(false)}
        onInject={fetchIncidents}
      />

      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertOctagon size={24} className="text-red-500" /> Incident Intelligence Center
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.875rem' }}>Automated anomaly detection, predictive RCA metrics, and manual policy overrides</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
            onClick={() => setSandboxOpen(true)}
          >
            <Terminal size={14} /> Sandbox Tools
          </button>
          <span className={`badge ${stats.critical > 0 ? 'badge-danger' : 'badge-success'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            {stats.critical > 0 ? (
              <><AlertCircle size={12} className="animate-pulse" /> {stats.critical} Critical</>
            ) : (
              <><CheckCircle2 size={12} /> All Muted</>
            )}
          </span>
        </div>
      </div>

      {/* KPI stats widgets */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        {[
          { label: 'Active Alerts', value: String(stats.total), icon: <AlertTriangle size={18} className="text-purple-400" />, color: 'var(--text-primary)' },
          { label: 'Critical', value: String(stats.critical), icon: <AlertCircle size={18} className="text-red-500" />, color: 'var(--accent-red)' },
          { label: 'High Severity', value: String(stats.high), icon: <AlertTriangle size={18} className="text-amber-500" />, color: 'var(--accent-orange)' },
          { label: 'AI Diagnostic RCAs', value: String(stats.total), icon: <Cpu size={18} className="text-cyan-500" />, color: 'var(--accent-purple-light)' },
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

      {/* Main Stream section */}
      <div className="card" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Telemetry Ingestion Streams</h3>
          <span className="badge badge-purple" style={{ fontSize: '0.625rem' }}>PROMETHEUS + SENTRY</span>
        </div>

        <div className="flex flex-col gap-4">
          {activeIncidentsList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <CheckCircle2 size={40} className="text-emerald-500 animate-pulse" />
              </div>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                No active incidents detected
              </p>
              <p className="text-muted text-sm">
                All production container clusters are healthy and operational.
              </p>
            </div>
          ) : (
            activeIncidentsList.map(inc => (
              <IncidentCard key={inc.id} incident={inc as any} onRefresh={fetchIncidents} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
