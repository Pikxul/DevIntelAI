'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, Shield, Rocket, Activity, Zap, Plug, ArrowUpCircle, FlaskConical, Database, TrendingUp, Sparkles, Star } from 'lucide-react';

const features = [
  { icon: <Bot size={28} className="text-purple-400" />, title: 'AI Code Review', desc: 'GPT-4o + Claude 3.5 analyze every commit for security, quality, and logic issues before they reach production.' },
  { icon: <Shield size={28} className="text-blue-400" />, title: 'Security Scanning', desc: 'Semgrep, Trivy & SonarCloud scan for CVEs, misconfigurations, and OWASP vulnerabilities automatically.' },
  { icon: <Rocket size={28} className="text-emerald-400" />, title: 'Smart Deployment', desc: 'Rolling, blue-green, and canary releases with automatic traffic splitting and health checks.' },
  { icon: <Activity size={28} className="text-cyan-400" />, title: 'AI Anomaly Detection', desc: 'Continuously monitor production metrics and auto-rollback when anomalies are detected.' },
  { icon: <Zap size={28} className="text-amber-400" />, title: 'Real-time Pipeline', desc: 'WebSocket-powered live pipeline status with instant Slack/Teams notifications.' },
  { icon: <Plug size={28} className="text-indigo-400" />, title: 'VS Code Extension', desc: 'Inline AI code review, risk scores, and suggestions directly in your editor.' },
];

const pipeline = [
  { icon: <ArrowUpCircle size={18} />, label: 'Push' },
  { icon: <Bot size={18} />, label: 'AI Review' },
  { icon: <Shield size={18} />, label: 'Security' },
  { icon: <FlaskConical size={18} />, label: 'Tests' },
  { icon: <Database size={18} />, label: 'Build' },
  { icon: <Rocket size={18} />, label: 'Deploy' },
  { icon: <TrendingUp size={18} />, label: 'Monitor' },
];

const stats = [
  { value: '< 90s', label: 'Avg AI Review Time', trend: '+14% speedup' },
  { value: '99.2%', label: 'Pipeline Uptime', trend: 'Optimal' },
  { value: '67%', label: 'Fewer Production Incidents', trend: 'DORA Elite' },
  { value: '$0.003', label: 'Avg Review Cost', trend: '95% reduction' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Dynamic Background Glow Spheres */}
      <div className="glow-sphere glow-purple" style={{ top: '-10%', left: '15%' }} />
      <div className="glow-sphere glow-blue" style={{ top: '40%', right: '10%' }} />
      <div className="glow-sphere glow-purple" style={{ bottom: '-5%', left: '20%' }} />

      {/* Navigation */}
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '1rem 0', position: 'sticky', top: 0, background: 'rgba(10,11,15,0.85)', backdropFilter: 'blur(20px)', zIndex: 100 }}>
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3" style={{ cursor: 'pointer' }}>
            <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}>
              <Zap size={16} className="text-white fill-white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>DevIntel<span className="gradient-text">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn btn-secondary btn-sm" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>Dashboard</Link>
            <Link href="/dashboard" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '7rem 0 4rem', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="badge hero-badge" style={{ margin: '0 auto 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', borderRadius: '100px' }}>
              <Sparkles size={14} className="text-purple-400" /> AI-Powered DevOps Platform
            </div>
            <h1 className="shimmer-text" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1.5rem', maxWidth: '900px', margin: '0 auto 1.5rem' }}>
              Ship Code Faster, Smarter & Safer
            </h1>
            <p style={{ fontSize: '1.25rem', maxWidth: '680px', margin: '0 auto 3rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The world's first DevOps platform with built-in AI code review, risk scoring, and production anomaly detection — from push to deploy.
            </p>
            <div className="flex items-center gap-3" style={{ justifyContent: 'center' }}>
              <Link href="/dashboard" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.3)' }}>
                <Zap size={18} className="animate-pulse" /> Launch Dashboard
              </Link>
              <a href="https://github.com" className="btn btn-secondary btn-lg" target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Star size={18} className="text-yellow-400" /> GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pipeline Visualization */}
      <section style={{ padding: '3rem 0 5rem', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div className="card" style={{ padding: '2.5rem', background: 'rgba(30, 32, 36, 0.45)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div>
                <p className="text-xs text-muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent-purple-light)' }}>Operational Telemetry</p>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>Live Pipeline Flow</h3>
              </div>
              <div className="badge badge-purple" style={{ padding: '0.3rem 0.75rem' }}>Active Release</div>
            </div>

            {/* Mathematically aligned pipeline nodes & animated connectors */}
            <div className="pipeline-flow" style={{ justifyContent: 'center', display: 'flex', alignItems: 'flex-start' }}>
              {pipeline.map((stage, i) => (
                <div key={stage.label} className="flex" style={{ alignItems: 'flex-start' }}>
                  <motion.div
                    className="stage-node"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div 
                      className={`stage-icon ${i < 4 ? 'success' : i === 4 ? 'running' : 'pending'}`}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--border)',
                        backgroundColor: 'var(--bg-surface-2)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {stage.icon}
                    </div>
                    <span className="stage-label" style={{ marginTop: '0.75rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {stage.label}
                    </span>
                  </motion.div>
                  {i < pipeline.length - 1 && (
                    <div 
                      className={`stage-connector ${i < 4 ? 'active' : ''}`} 
                      style={{
                        marginTop: '21px',
                        animationDelay: `${i * 0.4}s`
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '2rem 0 5rem', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div className="stats-grid">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="stat-card feature-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{ textAlign: 'left', padding: '2rem 1.75rem', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(30, 32, 36, 0.35)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div className="stat-value gradient-text" style={{ fontSize: '2.25rem', fontWeight: 800 }}>{s.value}</div>
                  <span className="badge badge-purple" style={{ fontSize: '0.625rem', padding: '0.2rem 0.5rem' }}>{s.trend}</span>
                </div>
                <div className="stat-label" style={{ marginTop: '0.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '5rem 0', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '4rem', fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Everything you need for <span className="gradient-text">AI-driven DevOps</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="feature-card"
                style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="feature-icon-wrapper">{f.icon}</div>
                <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '6rem 0', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div className="card card-glow" style={{ padding: '5rem 2rem', background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, rgba(30, 32, 36, 0.5) 100%)', border: '1px solid rgba(139, 92, 246, 0.25)', boxShadow: 'var(--shadow-glow)', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Ready to ship faster?</h2>
            <p style={{ marginBottom: '3rem', fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 3rem' }}>Set up your AI DevOps pipeline in under 5 minutes.</p>
            <Link href="/dashboard" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', margin: '0 auto', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)' }}>
              <Rocket size={18} className="animate-bounce" /> Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'rgba(15, 17, 21, 0.95)', padding: '5rem 0 3rem', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
              <div className="flex items-center gap-3">
                <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }}>
                  <Zap size={14} className="text-white fill-white" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>DevIntel<span className="gradient-text">AI</span></span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                AI-native SaaS platform bringing intelligence, automated governance, and predictive reliability to engineering organizations worldwide.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.75rem' }}>
                  ● All Systems Operational
                </span>
              </div>
            </div>
            
            <div className="footer-link-group">
              <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Product</span>
              <Link href="/dashboard" className="footer-link">Pipelines Control</Link>
              <Link href="/dashboard" className="footer-link">AI Code Review</Link>
              <Link href="/dashboard" className="footer-link">VS Code Extension</Link>
              <Link href="/dashboard" className="footer-link">Incident Diagnostics</Link>
            </div>

            <div className="footer-link-group">
              <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Resources</span>
              <a href="https://github.com" target="_blank" className="footer-link">Documentation</a>
              <a href="https://github.com" target="_blank" className="footer-link">API Reference</a>
              <a href="https://github.com" target="_blank" className="footer-link">Changelog</a>
              <a href="https://github.com" target="_blank" className="footer-link">System Status</a>
            </div>

            <div className="footer-link-group">
              <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Enterprise</span>
              <Link href="/dashboard" className="footer-link">SSO & Identity</Link>
              <Link href="/dashboard" className="footer-link">RBAC Policies</Link>
              <Link href="/dashboard" className="footer-link">Compliance Logs</Link>
              <Link href="/dashboard" className="footer-link">Contact Sales</Link>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <p className="text-muted text-sm">
              © 2026 DevIntelAI Platform. All rights reserved.
            </p>
            <p className="text-muted text-sm" style={{ color: 'var(--text-muted)' }}>
              AI DevOps Platform — Built with NestJS, Next.js, OpenAI & Claude
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
