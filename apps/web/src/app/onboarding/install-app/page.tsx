'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Github, CheckCircle2, AlertCircle, Server, Shield, Zap } from 'lucide-react';
import { completeOnboarding } from '@/lib/api';

export default function InstallAppPage() {
  const router = useRouter();
  const [appName, setAppName] = useState('');

  useEffect(() => {
    setAppName(process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'devintelai');
  }, []);

  const handleInstallClick = () => {
    const installUrl = `https://github.com/apps/${appName}/installations/new`;
    window.location.href = installUrl;
  };

  const handleSkip = async () => {
    try {
      await completeOnboarding();
      router.push('/dashboard');
    } catch (e) {
      console.error(e);
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      {/* Background embellishments */}
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(16,185,129,0.07)', filter: 'blur(120px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(139,92,246,0.07)', filter: 'blur(120px)', pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative', zIndex: 10, backdropFilter: 'blur(20px)', overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>

        {/* Left content */}
        <div style={{ padding: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* GitHub icon */}
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#24292e', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', marginBottom: '1.5rem', flexShrink: 0 }}>
            <Github color="white" size={24} />
          </div>

          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, background: 'linear-gradient(135deg, #e2e2e8, #8c909f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            Connect GitHub
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Install the DevIntelAI GitHub App to enable automated pipeline reviews, AI anomaly detection, and CI/CD monitoring.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { icon: <Zap size={14} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)', title: 'Real-time Sync', desc: 'Automated ingestion of commits and PRs' },
              { icon: <Shield size={14} />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', title: 'Secure AI Reviews', desc: 'LLM-powered code scanning on every commit' },
              { icon: <Server size={14} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', title: 'Zero-Config Deployments', desc: 'We automatically track deployments via webhooks' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ marginTop: '1px', color: item.color, background: item.bg, padding: '5px', borderRadius: '50%', flexShrink: 0, display: 'flex' }}>{item.icon}</div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#c2c6d6', marginBottom: '0.125rem' }}>{item.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <button
            onClick={handleInstallClick}
            style={{ width: '100%', background: '#2ea44f', color: 'white', fontWeight: 600, borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.9375rem', boxShadow: '0 6px 20px rgba(46,164,79,0.3)', transition: 'background 0.2s' }}
            onMouseOver={e => ((e.currentTarget as HTMLButtonElement).style.background = '#2c974b')}
            onMouseOut={e => ((e.currentTarget as HTMLButtonElement).style.background = '#2ea44f')}
          >
            <Github size={18} /> Install GitHub App
          </button>

          <button
            onClick={handleSkip}
            style={{ width: '100%', marginTop: '0.75rem', background: 'transparent', color: 'var(--text-muted)', fontWeight: 500, borderRadius: '0.75rem', padding: '0.625rem 1rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', transition: 'color 0.2s' }}
            onMouseOver={e => ((e.currentTarget as HTMLButtonElement).style.color = '#e2e2e8')}
            onMouseOut={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)')}
          >
            Skip for now
          </button>
        </div>

        {/* Right illustration panel */}
        <div style={{ width: '45%', background: 'linear-gradient(145deg, #1a1c20, #0d0f12)', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', flexShrink: 0 }} className="hidden-mobile">
          {/* Dot-grid background */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

          {/* Floating cards */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {[
              { Icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.15)', transform: 'rotate(-2deg)' },
              { Icon: Server, color: '#6366f1', bg: 'rgba(99,102,241,0.15)', transform: 'translateX(16px)' },
              { Icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', transform: 'rotate(2deg)' },
            ].map(({ Icon, color, bg, transform }, i) => (
              <div
                key={i}
                style={{ background: 'rgba(30,32,36,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.625rem', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', transform, transition: 'transform 0.3s ease' }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: '6px', width: `${48 + i * 20}px`, background: 'rgba(255,255,255,0.15)', borderRadius: '3px', marginBottom: '6px' }} />
                  <div style={{ height: '5px', width: `${64 + i * 8}px`, background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stepper indicator */}
      <div style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ height: '6px', width: '8px', borderRadius: '100px', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ height: '6px', width: '32px', borderRadius: '100px', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
