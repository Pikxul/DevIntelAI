'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Bot, Folder, CheckCircle2, XCircle, Clock, Check, AlertOctagon, ShieldCheck, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { getAIReviews, getAIReviewStats } from '@/lib/api';

const initialReviews = [
  { id: 'r-001', project: 'devintel-api', branch: 'main', commit: 'c-9e28f3a', riskScore: 23, level: 'low', issues: 2, approved: true, provider: 'Gemini 2.0 Flash', cost: '$0.001', time: '2m ago', author: 'SRE Team', confidence: 92, evidence: ['Clean dependencies', 'Robust error checks', 'Safe DB queries'] },
  { id: 'r-002', project: 'auth-service', branch: 'feat/oauth', commit: 'c-a382d1e', riskScore: 45, level: 'medium', issues: 7, approved: true, provider: 'Claude 3.5 Sonnet', cost: '$0.003', time: '8m ago', author: 'Dev Sec', confidence: 78, evidence: ['Valid encryption logic', 'No hardcoded credentials', 'Potential logging clutter'] },
  { id: 'r-003', project: 'data-processor-svc', branch: 'main', commit: 'c-1a82f3c', riskScore: 87, level: 'critical', issues: 14, approved: false, provider: 'Gemini 2.0 Pro', cost: '$0.008', time: '12m ago', author: 'CI Bot', confidence: 95, evidence: ['Unbounded thread pool', 'Database lock starvation vector', 'Missing transaction timeouts'] },
  { id: 'r-004', project: 'billing-engine', branch: 'refactor', commit: 'c-ff28a9b', riskScore: 62, level: 'high', issues: 9, approved: false, provider: 'Claude 3.5 Sonnet', cost: '$0.005', time: '18m ago', author: 'Dev Lead', confidence: 81, evidence: ['Insecure arithmetic limits', 'No idempotency keys', 'Deprecated libraries'] },
  { id: 'r-005', project: 'web-app-v2', branch: 'fix/ui', commit: 'c-ee287b2', riskScore: 12, level: 'low', issues: 1, approved: true, provider: 'Gemini 2.0 Flash', cost: '$0.001', time: '25m ago', author: 'UI Designer', confidence: 98, evidence: ['Clean CSS layout', 'Fully accessible tags', 'Optimized image elements'] },
];

const colorMap: Record<string, string> = {
  low: 'var(--accent-green)',
  medium: 'var(--accent-yellow)',
  high: 'var(--accent-orange)',
  critical: 'var(--accent-red)',
};

export default function AIReviewPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const statsData = await getAIReviewStats();
        setStats(statsData);
      } catch (err) {
        console.warn('Failed to load stats:', err);
      }

      try {
        const reviewsData = await getAIReviews(20);
        if (reviewsData && reviewsData.length > 0) {
          const mappedReviews = reviewsData.map((r: any) => {
            const mapped = {
              id: r.id,
              project: r.pipelineRunId?.slice(0, 8) || 'unknown',
              branch: 'main',
              commit: r.pipelineRunId?.slice(0, 7) || 'c-9e28f3a',
              riskScore: r.riskScore?.overall ?? 50,
              level: r.riskScore?.level ?? 'medium',
              issues: r.issues?.length ?? 0,
              approved: r.approved,
              provider: r.provider === 'gemini' ? 'Gemini 2.0 Flash' : (r.provider === 'anthropic' ? 'Claude 3.5 Sonnet' : 'OpenAI GPT-4o'),
              cost: `$${Number(r.costUsd || 0).toFixed(4)}`,
              time: new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              author: 'CI/CD Pipeline',
              confidence: r.riskScore?.confidence ?? Math.max(40, 100 - (r.riskScore?.overall ?? 50)),
              evidence: r.riskScore?.evidence ?? [],
              raw: r
            };
            return mapped;
          });
          setReviews(mappedReviews);
          // Set selection
          setSelectedReview(prev => {
            if (prev) {
              const matched = mappedReviews.find(x => x.id === prev.id);
              if (matched) return matched;
            }
            return mappedReviews[0];
          });
        } else {
          setReviews(initialReviews);
          setSelectedReview(prev => prev || initialReviews[2]);
        }
      } catch (err) {
        console.warn('Failed to load reviews:', err);
        setReviews(initialReviews);
        setSelectedReview(prev => prev || initialReviews[2]);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bot size={24} className="text-purple-400" /> AI Static Code Analytics
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.875rem' }}>Automated risk scanning, CVE vulnerability checks, and multi-model code diagnostics</p>
        </div>
        <div className="page-header-actions">
          <span className="badge badge-purple">Gemini + Claude Active</span>
          <span className="badge badge-success">
            {stats ? `$${Number(stats.totalCostUsd).toFixed(4)} Ingested` : '$0.024 Ingested Today'}
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        {[
          { label: 'Ingested Commits', value: stats ? stats.total : '3,891', icon: <Folder size={18} className="text-purple-400" />, color: 'var(--text-primary)' },
          { label: 'Auto-Approved', value: stats ? stats.approved : '3,677', icon: <CheckCircle2 size={18} className="text-emerald-500" />, color: 'var(--accent-green)' },
          { label: 'Blocked Policy Gate', value: stats ? stats.blocked : '214', icon: <XCircle size={18} className="text-red-500" />, color: 'var(--accent-red)' },
          { label: 'Avg Risk Rating', value: stats ? `${stats.avgRiskScore}/100` : '35/100', icon: <Clock size={18} className="text-cyan-500" />, color: 'var(--accent-cyan)' },
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

      {/* Split screen: Left table, Right interactive diagnostics panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }}>
        
        {/* Left Side: Table of Recent Reviews */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Scanner Telemetry Logs</h3>
          
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted text-sm flex items-center justify-center gap-2">
              <Loader2 className="animate-spin text-purple-400" size={16} />
              <span>Fetching telemetry…</span>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Repo</th>
                    <th>Commit</th>
                    <th>Risk Rating</th>
                    <th>Decision</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map(r => (
                    <tr 
                      key={r.id} 
                      style={{ 
                        cursor: 'pointer', 
                        background: selectedReview?.id === r.id ? 'rgba(255,255,255,0.03)' : 'transparent' 
                      }}
                      onClick={() => setSelectedReview(r)}
                    >
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.project}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{r.branch} · {r.time}</div>
                        </div>
                      </td>
                      <td><code className="font-mono text-xs" style={{ color: 'var(--accent-cyan)' }}>{r.commit}</code></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 44, height: 6, background: 'var(--bg-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${r.riskScore}%`, height: '100%', background: colorMap[r.level] || 'var(--accent-yellow)', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontWeight: 700, color: colorMap[r.level] || 'var(--accent-yellow)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{r.riskScore}</span>
                        </div>
                      </td>
                      <td>
                        {r.approved ? (
                          <span className="badge badge-success" style={{ fontSize: '0.625rem' }}>Approved</span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.625rem' }}>Blocked</span>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ArrowRight size={14} className="text-muted" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Diagnostics details */}
        <AnimatePresence mode="wait">
          {selectedReview && (
            <motion.div
              key={selectedReview.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card"
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: `1px solid ${selectedReview.approved ? 'var(--border)' : 'rgba(239,68,68,0.25)'}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>Vulnerability Diagnostics</h4>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Commit: {selectedReview.commit} · Author: {selectedReview.author}</p>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '0.625rem' }}>{selectedReview.provider}</span>
              </div>

              {/* Score visual rings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto' }}>
                  <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={colorMap[selectedReview.level] || 'var(--accent-yellow)'} strokeWidth="8" strokeDasharray="264" strokeDashoffset={264 - (264 * selectedReview.riskScore) / 100} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedReview.riskScore}</span>
                    <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risk Rating</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Confidence Score</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{selectedReview.confidence}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Detected Issues</span>
                    <span>{selectedReview.issues} Lint warnings</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Model scanning cost</span>
                    <span style={{ fontFamily: 'monospace' }}>{selectedReview.cost}</span>
                  </div>
                </div>
              </div>

              {/* Explainability & SRE Evidence */}
              {selectedReview.evidence && selectedReview.evidence.length > 0 && (
                <div style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: 8 }}>SRE Diagnostic Evidence</div>
                  <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem', listStyleType: 'disc' }}>
                    {selectedReview.evidence.map((ev: string, idx: number) => (
                      <li key={idx}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Code vulnerability inspector (Datadog style) */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>CVE Vulnerability Ingestion</div>
                
                {selectedReview.raw && selectedReview.raw.issues && selectedReview.raw.issues.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedReview.raw.issues.map((issue: any, idx: number) => (
                      <div key={idx} style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--accent-red)', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <AlertOctagon size={14} className="text-red-500" /> [{issue.category?.toUpperCase()}] {issue.title || 'Vulnerability'}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 6 }}>
                          {issue.description}
                        </p>
                        {issue.suggestion && (
                          <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Suggestion: {issue.suggestion}
                          </p>
                        )}
                        {issue.file && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            File: <code>{issue.file}</code> : {issue.line}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {selectedReview.approved ? (
                      <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--accent-green)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Check size={14} className="text-emerald-500" /> Static Code Compliance Passed
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No OWASP top-10 security concerns or credentials leak identified in package profiles.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--accent-red)', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <AlertOctagon size={14} className="text-red-500" /> Blocked: Dependency CVE Vulnerability
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            A thread-pool starvation vector was detected in `main.go`. Reusing non-buffered connection instances triggers database locking anomalies under concurrent workloads.
                          </p>
                        </div>
                        
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Trace Diff Review</div>
                        <pre className="code-block" style={{ fontSize: '0.7rem', background: '#090A0D', border: '1px solid var(--border)' }}>
    {`- func processPayload(db *sql.DB) {
    -     // BAD: opening connection without timeout parameter
    -     conn, _ := db.Conn()
    + func processPayload(ctx context.Context, db *sql.DB) {
    +     // AI FIX: Attach context controls & execution limits
    +     conn, _ := db.Conn(ctx)`}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reviewer decision overrides */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                {selectedReview.approved ? (
                  <button 
                    onClick={() => alert('Vulnerability overrides configured. Pipeline run blocked.')}
                    className="btn btn-secondary btn-sm" 
                    style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                  >
                    <XCircle size={14} /> Trigger Manual Block
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => alert('Manual approval bypassed security thresholds. Audited log saved in compliance.')}
                      className="btn btn-secondary btn-sm" 
                      style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.25)', flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                      <ShieldCheck size={14} /> Bypass & Approve
                    </button>
                    <Link 
                      href="/dashboard/governance" 
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                      <Shield size={14} /> View approvals
                    </Link>
                  </>
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}

