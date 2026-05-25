'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPipelineById, getAIReviewByPipeline, PipelineRun, AIReviewResult, PipelineStage } from '@/lib/api';
import { ArrowUpCircle, Bot, Shield, FlaskConical, Database, Rocket, TrendingUp, Settings, Clock, AlertTriangle, FileText, AlertOctagon, Lightbulb, CheckCircle2, XCircle } from 'lucide-react';

const stageIcons: Record<string, React.ComponentType<any>> = {
  code_push: ArrowUpCircle, ai_review: Bot, security_scan: Shield,
  unit_tests: FlaskConical, containerize: Database, deploy: Rocket, notify: TrendingUp,
};

const statusColor: Record<string, string> = {
  success: 'var(--accent-green)', failed: 'var(--accent-red)',
  running: 'var(--accent-blue)', pending: 'var(--text-muted)',
  skipped: 'var(--text-muted)', blocked: 'var(--accent-orange)',
};

function StageCard({ stage, index }: { stage: PipelineStage; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const duration = stage.durationMs
    ? stage.durationMs < 60000
      ? `${Math.round(stage.durationMs / 1000)}s`
      : `${Math.floor(stage.durationMs / 60000)}m ${Math.round((stage.durationMs % 60000) / 1000)}s`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${stage.status === 'failed' ? 'rgba(239,68,68,0.3)' : stage.status === 'running' ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: stage.logs?.length ? 'pointer' : 'default' }}
        onClick={() => stage.logs?.length && setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `${statusColor[stage.status]}22`,
              border: `2px solid ${statusColor[stage.status]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
              animation: stage.status === 'running' ? 'pulse 2s infinite' : undefined,
            }}
          >
            {(() => {
              const Icon = stageIcons[stage.name] ?? Settings;
              return <Icon size={16} style={{ color: statusColor[stage.status] }} />;
            })()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', textTransform: 'capitalize' }}>
              {stage.name.replace(/_/g, ' ')}
            </div>
            {stage.startedAt && (
              <div className="text-xs text-muted">
                Started {new Date(stage.startedAt).toLocaleTimeString()}
                {duration && ` · ${duration}`}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            style={{
              padding: '0.2rem 0.625rem', borderRadius: 100, fontSize: '0.75rem', fontWeight: 600,
              background: `${statusColor[stage.status]}22`, color: statusColor[stage.status],
              border: `1px solid ${statusColor[stage.status]}44`,
            }}
          >
            {stage.status}
          </span>
          {stage.logs?.length ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{expanded ? '▲' : '▼'}</span>
          ) : null}
        </div>
      </div>
      {expanded && stage.logs && stage.logs.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            padding: '1rem 1.25rem',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {stage.logs.join('\n')}
          </pre>
        </div>
      )}
    </motion.div>
  );
}

function RiskBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? 'var(--accent-red)' : score >= 50 ? 'var(--accent-orange)' : score >= 30 ? 'var(--accent-yellow)' : 'var(--accent-green)';
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span className="text-sm text-secondary">{label}</span>
        <span style={{ fontWeight: 700, fontFamily: 'monospace', color }}>{score}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 100, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export default function PipelineDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [pipeline, setPipeline] = useState<PipelineRun | null>(null);
  const [review, setReview] = useState<AIReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getPipelineById(id),
      getAIReviewByPipeline(id).catch(() => null),
    ]).then(([p, r]) => {
      setPipeline(p);
      setReview(r);
    }).catch(e => setError(e.message))
      .finally(() => setIsLoading(false));

    const interval = setInterval(() => {
      getPipelineById(id)
        .then(p => { setPipeline(p); if (p.status !== 'running') clearInterval(interval); })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (isLoading) {
    return (
      <div className="animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
        <Clock size={36} className="animate-spin text-purple-500 mx-auto" style={{ marginBottom: '1rem' }} />
        <p className="text-muted">Loading pipeline details…</p>
      </div>
    );
  }

  if (error || !pipeline) {
    return (
      <div className="animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
        <AlertTriangle size={36} className="text-red-500 mx-auto" style={{ marginBottom: '1rem' }} />
        <p style={{ color: 'var(--accent-red)' }}>{error ?? 'Pipeline not found'}</p>
        <Link href="/dashboard/pipelines" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>← Back</Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    success: 'var(--accent-green)', failed: 'var(--accent-red)',
    running: 'var(--accent-blue)', blocked: 'var(--accent-orange)', pending: 'var(--text-muted)',
  };

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <Link href="/dashboard/pipelines" style={{ color: 'var(--accent-purple-light)' }}>Pipelines</Link>
        <span>›</span>
        <code style={{ color: 'var(--accent-cyan)' }}>{pipeline.commitSha.slice(0, 8)}</code>
        <span>›</span>
        <span>{pipeline.branch}</span>
      </div>

      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '1.25rem' }}>{pipeline.commitSha.slice(0, 8)}</span>
            <span style={{ padding: '0.2rem 0.75rem', borderRadius: 100, fontSize: '0.875rem', fontWeight: 600, background: `${statusColors[pipeline.status]}22`, color: statusColors[pipeline.status], border: `1px solid ${statusColors[pipeline.status]}44` }}>
              {pipeline.status}
            </span>
            {pipeline.status === 'running' && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-blue)', animation: 'pulse 2s infinite', display: 'inline-block' }} />}
          </h1>
          <p className="page-subtitle">
            {pipeline.projectId} · {pipeline.branch} · by {pipeline.author}
            {pipeline.message && ` · "${pipeline.message}"`}
          </p>
        </div>
        <Link href="/dashboard/pipelines" className="btn btn-secondary btn-sm">← All Pipelines</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: review ? '1fr 380px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Stages */}
        <div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Pipeline Stages</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pipeline.stages.length > 0 ? (
                pipeline.stages.map((stage, i) => (
                  <StageCard key={stage.id ?? i} stage={stage} index={i} />
                ))
              ) : (
                <p className="text-muted text-sm" style={{ padding: '2rem', textAlign: 'center' }}>
                  No stage data yet. Stages will appear as the pipeline progresses.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: AI Review */}
        {review && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Risk Score */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bot size={16} className="text-purple-400" /> AI Risk Analysis
                </h3>
                <span
                  style={{
                    fontWeight: 800, fontFamily: 'monospace', fontSize: '1.5rem',
                    color: review.riskScore.overall >= 70 ? 'var(--accent-red)' : review.riskScore.overall >= 40 ? 'var(--accent-yellow)' : 'var(--accent-green)',
                  }}
                >
                  {review.riskScore.overall}
                </span>
              </div>
              <RiskBar label="Overall Risk" score={review.riskScore.overall} />
              <RiskBar label="Security" score={review.riskScore.security} />
              <RiskBar label="Code Quality" score={review.riskScore.quality} />
              <RiskBar label="Complexity" score={review.riskScore.complexity} />
              <div
                style={{
                  marginTop: '1rem', padding: '0.625rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: review.approved ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${review.approved ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  color: review.approved ? 'var(--accent-green)' : 'var(--accent-red)',
                  fontWeight: 600, fontSize: '0.875rem', textAlign: 'center',
                }}
              >
                {review.approved ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'center', width: '100%' }}>
                    <CheckCircle2 size={14} /> Approved
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'center', width: '100%' }}>
                    <XCircle size={14} /> Blocked: {review.blockedReason}
                  </span>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '0.875rem' }}>
                <FileText size={16} className="text-purple-400" />
                <h3 style={{ fontSize: '0.9375rem' }}>AI Summary</h3>
              </div>
              <p className="text-sm" style={{ lineHeight: 1.7 }}>{review.summary}</p>
              <div className="flex items-center gap-3" style={{ marginTop: '0.875rem', flexWrap: 'wrap' }}>
                <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{review.provider} · {review.model}</span>
                <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{review.tokensUsed.toLocaleString()} tokens</span>
                <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>${review.costUsd.toFixed(4)}</span>
              </div>
            </div>

            {/* Issues */}
            {review.issues.length > 0 && (
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertOctagon size={16} className="text-red-500" /> Issues ({review.issues.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {review.issues.slice(0, 8).map((issue, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                      }}
                    >
                      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: '0.65rem', padding: '1px 6px', borderRadius: 100, fontWeight: 600,
                            background: issue.severity === 'critical' ? 'rgba(239,68,68,0.2)' : issue.severity === 'high' ? 'rgba(249,115,22,0.2)' : 'rgba(245,158,11,0.15)',
                            color: issue.severity === 'critical' ? 'var(--accent-red)' : issue.severity === 'high' ? 'var(--accent-orange)' : 'var(--accent-yellow)',
                          }}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-xs text-muted">{issue.category}</span>
                        {issue.file && (
                          <code style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', marginLeft: 'auto' }}>
                            {issue.file}{issue.line ? `:${issue.line}` : ''}
                          </code>
                        )}
                      </div>
                      <p className="text-xs text-secondary">{issue.description}</p>
                    </div>
                  ))}
                  {review.issues.length > 8 && (
                    <p className="text-xs text-muted" style={{ textAlign: 'center', padding: '0.5rem' }}>
                      +{review.issues.length - 8} more issues
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {review.recommendations.length > 0 && (
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lightbulb size={16} className="text-emerald-500" /> Recommendations
                </h3>
                <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {review.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
