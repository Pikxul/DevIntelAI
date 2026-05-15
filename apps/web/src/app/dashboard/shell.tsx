'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';

const navItems = [
  { href: '/dashboard', icon: '⚡', label: 'Overview' },
  { href: '/dashboard/pipelines', icon: '🔄', label: 'Pipelines' },
  { href: '/dashboard/ai-review', icon: '🤖', label: 'AI Review' },
  { href: '/dashboard/deployments', icon: '🚀', label: 'Deployments' },
  { href: '/dashboard/monitoring', icon: '📊', label: 'Monitoring' },
];

const settingsItems = [
  { href: '/dashboard/projects', icon: '📁', label: 'Projects' },
  { href: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
];

interface Props {
  children: React.ReactNode;
  session: Session;
}

export default function DashboardShell({ children, session }: Props) {
  const pathname = usePathname();

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">⚡</div>
          <span>AI<span className="gradient-text">DevOps</span></span>
        </div>

        <p className="nav-section-label">Pipeline</p>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <p className="nav-section-label">Config</p>
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="mt-auto">
          <div className="divider" />

          {/* User info */}
          <div style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {session.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? 'User'}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.4)' }}
              />
            )}
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.user?.name}
              </div>
              <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.user?.email}
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="nav-item"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', textAlign: 'left' }}
          >
            <span style={{ fontSize: '1rem' }}>🚪</span>
            Sign out
          </button>

          <div className="divider" />
          <div style={{ padding: '0.75rem', background: 'rgba(124,58,237,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: '0.875rem' }}>🟢</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>API Connected</span>
            </div>
            <div className="text-xs text-muted">OpenAI + Claude active</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">{children}</main>
    </div>
  );
}
