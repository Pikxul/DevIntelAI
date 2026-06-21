'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { createOrganization, type Organization } from '@/lib/api';

export default function CreateOrganizationPage() {
  const { update } = useSession();
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState<Organization | null>(null);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setOrgName(newName);
    if (slug === '' || slug === generateSlug(orgName)) {
      setSlug(generateSlug(newName));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!orgName || !slug) {
      setError('Please fill in both fields');
      return;
    }

    setLoading(true);
    try {
      const newOrg = await createOrganization({ name: orgName, slug });
      await update({ organizationId: newOrg.id });
      setOrganization(newOrg);
    } catch (err: any) {
      setError(err.message || 'Failed to configure organization');
    } finally {
      setLoading(false);
    }
  };

  if (organization) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(139,92,246,0.08)', filter: 'blur(120px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(16,185,129,0.08)', filter: 'blur(120px)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)', padding: '2.5rem', borderRadius: '1.25rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative', zIndex: 10, backdropFilter: 'blur(20px)' }}>
          {/* Success header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 color="#10b981" size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#e2e2e8', marginBottom: '0.125rem' }}>Organization created!</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{organization.name}</p>
            </div>
          </div>

          <div style={{ borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '0.875rem 1rem', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Workspace</p>
            <p style={{ color: '#e2e2e8', fontWeight: 600, wordBreak: 'break-all' }}>devintel.ai/{organization.slug}</p>
          </div>

          {/* Continue button */}
          <button
            onClick={() => router.push('/onboarding/install-app')}
            style={{ width: '100%', background: 'var(--gradient-brand)', color: 'white', fontWeight: 600, borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.9375rem', boxShadow: '0 8px 24px rgba(139,92,246,0.25)' }}
          >
            Continue <ArrowRight size={18} />
          </button>

          {/* Stepper */}
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ height: '6px', width: '32px', borderRadius: '100px', background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
            <div style={{ height: '6px', width: '8px', borderRadius: '100px', background: 'rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      {/* Background embellishments */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(139,92,246,0.08)', filter: 'blur(120px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(16,185,129,0.08)', filter: 'blur(120px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)', padding: '2.5rem', borderRadius: '1.25rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative', zIndex: 10, backdropFilter: 'blur(20px)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(139,92,246,0.3)', flexShrink: 0 }}>
            <Building2 color="white" size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, background: 'linear-gradient(135deg, #e2e2e8, #8c909f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.125rem' }}>
              Welcome to DevIntelAI
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Let's set up your workspace</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ padding: '0.75rem', borderRadius: '0.625rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#c2c6d6', marginLeft: '0.25rem' }}>Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={handleNameChange}
              placeholder="e.g. Acme Corp"
              required
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '0.75rem 1rem', color: '#e2e2e8', fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.6)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#c2c6d6', marginLeft: '0.25rem' }}>Workspace URL Slug</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', pointerEvents: 'none', zIndex: 1 }}>devintel.ai/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="acme-corp"
                required
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', paddingLeft: '6.5rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', color: '#e2e2e8', fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !orgName || !slug}
            style={{ width: '100%', marginTop: '0.5rem', background: loading || !orgName || !slug ? 'rgba(139,92,246,0.35)' : 'var(--gradient-brand)', color: 'white', fontWeight: 600, borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: loading || !orgName || !slug ? 'not-allowed' : 'pointer', fontSize: '0.9375rem', boxShadow: '0 8px 24px rgba(139,92,246,0.25)', transition: 'opacity 0.2s' }}
          >
            {loading ? (
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              'Create organization'
            )}
          </button>
        </form>

        {/* Stepper */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ height: '6px', width: '32px', borderRadius: '100px', background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
          <div style={{ height: '6px', width: '8px', borderRadius: '100px', background: 'rgba(255,255,255,0.1)' }} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
