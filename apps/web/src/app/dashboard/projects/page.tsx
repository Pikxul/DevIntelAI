'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getProjects, Project, getOrganization, connectGitHubAppRepo, listGitHubAppRepos, GitHubRepo, connectGitHubRepo, getProjectSyncStatus, listUserGitHubRepos } from '@/lib/api';
import { useSession } from 'next-auth/react';
import { Folder, RefreshCw, Zap, Plus, Github, Gitlab, AlertTriangle, Clock, Settings, Search, Lock, Globe, Star, X, CheckCircle2, Loader2 } from 'lucide-react';

const langColors: Record<string, string> = {
  TypeScript: '#3178c6',
  Go: '#00add8',
  Python: '#f7b731',
  Rust: '#f46524',
  JavaScript: '#f0db4f',
  Java: '#f89820',
  Ruby: '#cc342d',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  PHP: '#4f5d95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Scala: '#c22d40',
};

const statusBadge: Record<string, string> = {
  passing: 'badge-success',
  failing: 'badge-danger',
  blocked: 'badge-warning',
  active: 'badge-info',
};

function ConnectRepoModal({
  onClose,
  onSuccess,
  organizationId,
  installationId
}: {
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
  installationId?: number;
}) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [projectName, setProjectName] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [mode, setMode] = useState<'github' | 'manual'>('github');

  // Fetch repos on mount
  useEffect(() => {
    if (mode !== 'github') return;
    setLoadingRepos(true);
    setRepoError('');

    const fetchRepos = async () => {
      try {
        let fetchedRepos: GitHubRepo[];
        if (installationId) {
          fetchedRepos = await listGitHubAppRepos(installationId);
        } else {
          fetchedRepos = await listUserGitHubRepos();
        }
        setRepos(fetchedRepos);
      } catch (err: any) {
        setRepoError(err.message || 'Failed to load repositories');
      } finally {
        setLoadingRepos(false);
      }
    };

    fetchRepos();
  }, [mode, installationId]);

  // Filter repos by search
  const filteredRepos = useMemo(() => {
    if (!repoSearch) return repos;
    const query = repoSearch.toLowerCase();
    return repos.filter(r =>
      r.fullName.toLowerCase().includes(query) ||
      (r.description || '').toLowerCase().includes(query) ||
      (r.language || '').toLowerCase().includes(query)
    );
  }, [repos, repoSearch]);

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setProjectName(repo.name || repo.fullName.split('/')[1]);
    setDefaultBranch(repo.defaultBranch || 'main');
    setConnectError('');
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setConnectError('');

    try {
      if (mode === 'github') {
        if (!selectedRepo) throw new Error('Please select a repository');

        if (installationId) {
          await connectGitHubAppRepo({
            organizationId,
            installationId,
            repoFullName: selectedRepo.fullName,
            name: projectName,
            defaultBranch,
          });
        } else {
          await connectGitHubRepo({
            organizationId,
            repoFullName: selectedRepo.fullName,
            name: projectName,
            defaultBranch,
          });
        }
      } else {
        // Manual URL mode
        const urlInput = (document.getElementById('manual-repo-url') as HTMLInputElement)?.value;
        if (!urlInput) throw new Error('Repository URL is required');
        const match = urlInput.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
        const repoFullName = match ? match[1] : urlInput.split('/').slice(-2).join('/');

        await connectGitHubRepo({
          organizationId,
          repoFullName,
          name: projectName || repoFullName.split('/')[1],
          defaultBranch,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setConnectError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1.5rem', backdropFilter: 'blur(4px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%', maxWidth: 680, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Github size={20} style={{ color: 'var(--text-primary)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Connect Repository</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Select a GitHub repo to import
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-muted)', width: 32, height: 32,
              borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div style={{ padding: '1rem 1.5rem 0', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setMode('github')}
            style={{
              padding: '0.4rem 0.875rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              border: mode === 'github' ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border)',
              background: mode === 'github' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
              color: mode === 'github' ? 'var(--accent-purple-light, #c084fc)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            <Github size={14} /> My Repositories
          </button>
          <button
            onClick={() => setMode('manual')}
            style={{
              padding: '0.4rem 0.875rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              border: mode === 'manual' ? '1px solid rgba(6,182,212,0.5)' : '1px solid var(--border)',
              background: mode === 'manual' ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
              color: mode === 'manual' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            <Globe size={14} /> Manual URL
          </button>
        </div>

        {mode === 'github' ? (
          <>
            {/* Search bar */}
            <div style={{ padding: '1rem 1.5rem 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem',
              }}>
                <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={repoSearch}
                  onChange={e => setRepoSearch(e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
                  }}
                  autoFocus
                />
                {repoSearch && (
                  <button onClick={() => setRepoSearch('')} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    padding: 0, display: 'flex',
                  }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Repo list */}
            <div style={{
              padding: '0.75rem 1.5rem', flex: 1, overflowY: 'auto', minHeight: 0,
              maxHeight: 320,
            }}>
              {loadingRepos ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '3rem 0', gap: '0.75rem',
                }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading your repositories...</span>
                </div>
              ) : repoError ? (
                <div style={{
                  padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '0.75rem',
                }}>
                  <AlertTriangle size={24} style={{ color: 'var(--accent-red, #ef4444)' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--accent-red, #ef4444)', margin: 0 }}>{repoError}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Try signing in with GitHub to access your repos, or use Manual URL mode.
                  </p>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div style={{
                  padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '0.5rem',
                }}>
                  <Folder size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                    {repoSearch ? 'No matching repositories' : 'No repositories found'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    {repoSearch
                      ? 'Try a different search term or use Manual URL.'
                      : 'Sign in with GitHub to list your repos, or use Manual URL.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {filteredRepos.map((repo, i) => {
                    const isSelected = selectedRepo?.fullName === repo.fullName;
                    return (
                      <motion.div
                        key={repo.fullName}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => handleRepoSelect(repo)}
                        style={{
                          padding: '0.75rem 0.875rem',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected
                            ? '1px solid rgba(139,92,246,0.6)'
                            : '1px solid transparent',
                          background: isSelected
                            ? 'rgba(139,92,246,0.08)'
                            : 'rgba(255,255,255,0.02)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                          }
                        }}
                      >
                        {/* Selection indicator */}
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          border: isSelected ? 'none' : '2px solid var(--border)',
                          background: isSelected ? 'var(--accent-purple, #8b5cf6)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {isSelected && <CheckCircle2 size={14} style={{ color: '#fff' }} />}
                        </div>

                        {/* Repo info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 2 }}>
                            <span style={{
                              fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {repo.fullName}
                            </span>
                            {repo.private ? (
                              <Lock size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            ) : (
                              <Globe size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            )}
                          </div>
                          {repo.description && (
                            <p style={{
                              margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              maxWidth: '100%',
                            }}>
                              {repo.description}
                            </p>
                          )}
                        </div>

                        {/* Meta badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                          {repo.language && (
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: '0.25rem',
                              fontSize: '0.6875rem', color: 'var(--text-muted)',
                            }}>
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: langColors[repo.language] || '#8b949e',
                              }} />
                              {repo.language}
                            </span>
                          )}
                          {repo.stars > 0 && (
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: '0.2rem',
                              fontSize: '0.6875rem', color: 'var(--text-muted)',
                            }}>
                              <Star size={10} /> {repo.stars}
                            </span>
                          )}
                          {repo.updatedAt && (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              {formatDate(repo.updatedAt)}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Manual URL mode */
          <div style={{ padding: '1rem 1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Repository URL
            </label>
            <input
              id="manual-repo-url"
              type="url"
              placeholder="https://github.com/owner/repo"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', padding: '0.6rem 0.875rem',
                fontSize: '0.875rem', outline: 'none',
              }}
            />
          </div>
        )}

        {/* Project config (shown when repo selected or in manual mode) */}
        <AnimatePresence>
          {(selectedRepo || mode === 'manual') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <form onSubmit={handleConnect} style={{
                padding: '0.75rem 1.5rem 1.5rem',
                borderTop: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>
                      Project Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. api-service"
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      required
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)', padding: '0.5rem 0.75rem',
                        fontSize: '0.8125rem', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>
                      Default Branch
                    </label>
                    <input
                      type="text"
                      placeholder="main"
                      value={defaultBranch}
                      onChange={e => setDefaultBranch(e.target.value)}
                      required
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)', padding: '0.5rem 0.75rem',
                        fontSize: '0.8125rem', outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {connectError && (
                  <div style={{
                    color: 'var(--accent-red)', fontSize: '0.8125rem',
                    padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)',
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                  }}>
                    <AlertTriangle size={14} /> {connectError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.8125rem' }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={connecting || (mode === 'github' && !selectedRepo)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {connecting ? (
                      <><Loader2 size={14} className="animate-spin" /> Connecting…</>
                    ) : (
                      <><Plus size={14} /> Connect Repository</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* If no repo is selected yet and in github mode, show a footer hint */}
        {mode === 'github' && !selectedRepo && !loadingRepos && filteredRepos.length > 0 && (
          <div style={{
            padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)',
            fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center',
          }}>
            Select a repository to continue · {filteredRepos.length} repo{filteredRepos.length !== 1 ? 's' : ''} available
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ProjectRow({ project, delay }: { project: Project, delay: number }) {
  const [syncStatus, setSyncStatus] = useState(project.syncStatus || 'pending');
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (syncStatus === 'pending' || syncStatus === 'syncing') {
      interval = setInterval(async () => {
        try {
          const res = await getProjectSyncStatus(project.id);
          setSyncStatus(res.status as any);
          if (res.status === 'completed' || res.status === 'failed') {
            clearInterval(interval);
          }
        } catch (e) {
          console.error('Failed to poll sync status', e);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [project.id, syncStatus]);

  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontWeight: 600 }}>{project.name}</span>
          {syncStatus === 'syncing' && (
            <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-cyan)' }}>
              <Clock size={10} className="animate-spin" /> Syncing...
            </span>
          )}
          {syncStatus === 'completed' && (
            <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-green)' }}>
              <Zap size={10} /> Synced
            </span>
          )}
          {syncStatus === 'failed' && (
            <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-red)' }}>
              <AlertTriangle size={10} /> Sync Failed
            </span>
          )}
        </div>
      </td>
      <td>
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}
        >
          {project.repoUrl.replace('https://', '').replace('http://', '')}
        </a>
      </td>
      <td>
        <code className="font-mono text-xs" style={{ color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: 4 }}>
          {project.defaultBranch}
        </code>
      </td>
      <td>
        <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          {project.repoProvider === 'github' ? (
            <><Github size={12} /> GitHub</>
          ) : (
            <><Gitlab size={12} /> GitLab</>
          )}
        </span>
      </td>
      <td>
        <span style={{
          fontWeight: 700, fontFamily: 'monospace',
          color: project.riskThreshold >= 80 ? 'var(--accent-red)' : project.riskThreshold >= 60 ? 'var(--accent-yellow)' : 'var(--accent-green)',
        }}>
          {project.riskThreshold}
        </span>
      </td>
      <td className="text-xs text-muted">
        {new Date(project.createdAt).toLocaleDateString()}
      </td>
      <td>
        <button className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Settings size={12} /> Settings
        </button>
      </td>
    </motion.tr>
  );
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const organizationId = (session as any)?.organizationId;
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [installationId, setInstallationId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!organizationId) return;
    try {
      setIsLoading(true);
      const [data, orgData] = await Promise.all([
        getProjects(organizationId),
        getOrganization(organizationId)
      ]);
      setProjects(data);
      if (orgData.githubInstallationId) {
        setInstallationId(orgData.githubInstallationId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filtered = projects.filter(
    p => p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.repoUrl.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: projects.length,
    active: projects.length,
    riskAvg: projects.length > 0
      ? Math.round(projects.reduce((a, p) => a + p.riskThreshold, 0) / projects.length)
      : 0,
  };

  return (
    <div className="animate-fade-in">
      {showModal && <ConnectRepoModal 
        onClose={() => setShowModal(false)} 
        onSuccess={fetchProjects} 
        organizationId={organizationId}
        installationId={installationId}
      />}

      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Folder size={24} className="text-purple-400" /> Projects
          </h1>
          <p className="page-subtitle">Manage connected repositories and pipeline configurations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn btn-primary"
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            onClick={() => setShowModal(true)}
          >
            <Plus size={16} /> Connect Repo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
        {[
          { label: 'Total Projects', value: isLoading ? '—' : String(stats.total), icon: <Folder size={18} className="text-purple-400" />, color: 'var(--accent-purple-light)' },
          { label: 'Active', value: isLoading ? '—' : String(stats.active), icon: <RefreshCw size={18} className="text-cyan-500" />, color: 'var(--accent-cyan)' },
          { label: 'Avg Risk Threshold', value: isLoading ? '—' : String(stats.riskAvg), icon: <Zap size={18} className="text-amber-500" />, color: 'var(--accent-yellow)' },
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

      {/* Search + Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
          <h3>Connected Repositories</h3>
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              padding: '0.4rem 0.75rem', fontSize: '0.875rem', outline: 'none', width: 220,
            }}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted text-sm">Loading projects…</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-red)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
              <p>{error}</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <Folder size={40} className="text-muted" />
            </div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              {search ? 'No matching projects' : 'No projects yet'}
            </p>
            <p className="text-muted text-sm">
              {search ? 'Clear your search to see all projects.' : 'Click "Connect Repo" to add your first GitHub repository.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Repository</th>
                  <th>Branch</th>
                  <th>Provider</th>
                  <th>Risk Threshold</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <ProjectRow key={p.id} project={p} delay={i * 0.04} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
