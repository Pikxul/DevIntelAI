'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

const features = [
  { icon: '🤖', title: 'AI Code Review', desc: 'GPT-4o + Claude 3.5 analyze every commit for security, quality, and logic issues before they reach production.' },
  { icon: '🔒', title: 'Security Scanning', desc: 'Semgrep, Trivy & SonarCloud scan for CVEs, misconfigurations, and OWASP vulnerabilities automatically.' },
  { icon: '🚀', title: 'Smart Deployment', desc: 'Rolling, blue-green, and canary releases with automatic traffic splitting and health checks.' },
  { icon: '📊', title: 'AI Anomaly Detection', desc: 'Continuously monitor production metrics and auto-rollback when anomalies are detected.' },
  { icon: '⚡', title: 'Real-time Pipeline', desc: 'WebSocket-powered live pipeline status with instant Slack/Teams notifications.' },
  { icon: '🔌', title: 'VS Code Extension', desc: 'Inline AI code review, risk scores, and suggestions directly in your editor.' },
];

const pipeline = [
  { icon: '📤', label: 'Push' },
  { icon: '🤖', label: 'AI Review' },
  { icon: '🔒', label: 'Security' },
  { icon: '🧪', label: 'Tests' },
  { icon: '🐳', label: 'Build' },
  { icon: '🚀', label: 'Deploy' },
  { icon: '📈', label: 'Monitor' },
];

const stats = [
  { value: '< 90s', label: 'Avg AI Review Time' },
  { value: '99.2%', label: 'Pipeline Uptime' },
  { value: '67%', label: 'Fewer Production Incidents' },
  { value: '$0.003', label: 'Avg Review Cost' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navigation */}
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '1rem 0', position: 'sticky', top: 0, background: 'rgba(10,11,15,0.9)', backdropFilter: 'blur(20px)', zIndex: 100 }}>
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="logo-icon">⚡</div>
            <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>AI<span className="gradient-text">DevOps</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn btn-secondary btn-sm">Dashboard</Link>
            <Link href="/dashboard" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '6rem 0 4rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="badge badge-purple" style={{ margin: '0 auto 1.5rem', display: 'inline-flex' }}>
              ✨ AI-Powered DevOps Platform
            </div>
            <h1 style={{ marginBottom: '1.5rem', maxWidth: '800px', margin: '0 auto 1.5rem' }}>
              Ship Code Faster,{' '}
              <span className="gradient-text">Smarter</span>{' '}
              & Safer
            </h1>
            <p style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2.5rem', color: 'var(--text-secondary)' }}>
              The world's first DevOps platform with built-in AI code review, risk scoring, and production anomaly detection — from push to deploy.
            </p>
            <div className="flex items-center gap-3" style={{ justifyContent: 'center' }}>
              <Link href="/dashboard" className="btn btn-primary btn-lg">
                ⚡ Launch Dashboard
              </Link>
              <a href="https://github.com" className="btn btn-secondary btn-lg" target="_blank">
                ⭐ GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pipeline Visualization */}
      <section style={{ padding: '2rem 0 4rem' }}>
        <div className="container">
          <div className="card" style={{ padding: '2rem', overflow: 'hidden' }}>
            <p className="text-xs text-muted" style={{ marginBottom: '1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Pipeline Flow</p>
            <div className="pipeline-flow" style={{ justifyContent: 'center' }}>
              {pipeline.map((stage, i) => (
                <div key={stage.label} className="flex items-center">
                  <motion.div
                    className="stage-node"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className={`stage-icon ${i < 4 ? 'success' : i === 4 ? 'running' : 'pending'}`}>
                      {stage.icon}
                    </div>
                    <span className="stage-label">{stage.label}</span>
                  </motion.div>
                  {i < pipeline.length - 1 && (
                    <div className={`stage-connector ${i < 4 ? 'active' : ''}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '2rem 0 4rem' }}>
        <div className="container">
          <div className="stats-grid">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="stat-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{ textAlign: 'center' }}
              >
                <div className="stat-value gradient-text">{s.value}</div>
                <div className="stat-label" style={{ marginTop: '0.5rem' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>
            Everything you need for <span className="gradient-text">AI-driven DevOps</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="card"
                style={{ padding: '1.75rem' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
                <h3 style={{ marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="container">
          <div className="card card-glow" style={{ padding: '4rem 2rem', background: 'var(--gradient-card)' }}>
            <h2 style={{ marginBottom: '1rem' }}>Ready to ship faster?</h2>
            <p style={{ marginBottom: '2.5rem', fontSize: '1.125rem' }}>Set up your AI DevOps pipeline in under 5 minutes.</p>
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              🚀 Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 0', textAlign: 'center' }}>
        <div className="container">
          <p className="text-muted text-sm">
            AI DevOps Platform — Built with NestJS, Next.js, OpenAI & Claude
          </p>
        </div>
      </footer>
    </div>
  );
}
