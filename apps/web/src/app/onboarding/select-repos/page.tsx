'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderGit2, Check, ArrowRight, Loader2, Plus, Github } from 'lucide-react';
import { listUserGitHubRepos, connectGitHubRepo, completeOnboarding, GitHubRepo } from '@/lib/api';
import { useOrganizationId } from '@/hooks/useOrganizationId';

export default function SelectReposPage() {
  const router = useRouter();
  const orgId = useOrganizationId();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listUserGitHubRepos()
      .then((data) => {
        setRepos(data);
      })
      .catch((err) => {
        console.warn('Failed to fetch user repos:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const toggleRepo = (fullName: string) => {
    const next = new Set(selectedRepos);
    if (next.has(fullName)) {
      next.delete(fullName);
    } else {
      next.add(fullName);
    }
    setSelectedRepos(next);
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      // Connect selected repos
      for (const fullName of Array.from(selectedRepos)) {
        const repo = repos.find((r) => r.fullName === fullName);
        if (repo) {
          await connectGitHubRepo({
            organizationId: orgId,
            repoFullName: repo.fullName,
            name: repo.name || repo.fullName.split('/')[1],
            defaultBranch: repo.defaultBranch || 'main',
          }).catch((e) => console.warn('Repo connect error:', e));
        }
      }

      await completeOnboarding();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to finish onboarding');
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(139,92,246,0.08)', filter: 'blur(120px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(16,185,129,0.08)', filter: 'blur(120px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '560px', background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)', padding: '2.5rem', borderRadius: '1.25rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative', zIndex: 10, backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FolderGit2 color="white" size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#e2e2e8', margin: 0 }}>Select Repositories</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>Choose repositories to sync with DevIntel AI</p>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            <p className="text-sm">Loading accessible GitHub repositories…</p>
          </div>
        ) : repos.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <Github size={32} className="text-muted" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 600, margin: '0 0 0.25rem 0' }}>No repositories discovered</p>
            <p className="text-xs text-muted" style={{ margin: 0 }}>You can connect repositories anytime from the Projects page.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', paddingRight: '0.25rem' }}>
            {repos.map((r) => {
              const isSelected = selectedRepos.has(r.fullName);
              return (
                <div
                  key={r.fullName}
                  onClick={() => toggleRepo(r.fullName)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.625rem',
                    border: `1px solid ${isSelected ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.06)'}`,
                    background: isSelected ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#e2e2e8' }}>{r.name || r.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.fullName}</div>
                  </div>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: `1px solid ${isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.2)'}`,
                      background: isSelected ? '#8b5cf6' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSelected && <Check size={14} color="white" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleFinish}
            disabled={saving}
            style={{
              flex: 1,
              background: 'var(--gradient-brand)',
              color: 'white',
              fontWeight: 600,
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.9375rem',
              boxShadow: '0 8px 24px rgba(139,92,246,0.25)',
            }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <>Continue to Dashboard <ArrowRight size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
