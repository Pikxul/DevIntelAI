'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, GitBranch, Bot, Rocket, AlertTriangle, BarChart3, ShieldAlert, Folder, Settings, Cpu, LogOut, Search, Send } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

const navItems = [
  { href: '/dashboard', icon: <Zap size={16} />, label: 'Overview', permission: 'dashboard:view' },
  { href: '/dashboard/pipelines', icon: <GitBranch size={16} />, label: 'Pipelines', permission: 'pipeline:view' },
  { href: '/dashboard/ai-review', icon: <Bot size={16} />, label: 'AI Review', permission: 'ai_review:view' },
  { href: '/dashboard/deployments', icon: <Rocket size={16} />, label: 'Deployments', permission: 'deployment:view' },
  { href: '/dashboard/incidents', icon: <AlertTriangle size={16} />, label: 'Incidents', permission: 'incident:view' },
  { href: '/dashboard/monitoring', icon: <BarChart3 size={16} />, label: 'Observability', permission: 'monitoring:view' },
  { href: '/dashboard/governance', icon: <ShieldAlert size={16} />, label: 'Governance', permission: 'governance:view' },
];

const settingsItems = [
  { href: '/dashboard/projects', icon: <Folder size={16} />, label: 'Projects', permissionAny: ['repo:connect', 'repo:view'] },
  { href: '/dashboard/settings', icon: <Settings size={16} />, label: 'Settings', permission: 'org:settings' },
];

// Bottom nav shows only key 5 items on mobile
const mobileNavItems = [
  { href: '/dashboard', icon: <Zap size={16} />, label: 'Overview' },
  { href: '/dashboard/pipelines', icon: <GitBranch size={16} />, label: 'Pipelines' },
  { href: '/dashboard/incidents', icon: <AlertTriangle size={16} />, label: 'Incidents' },
  { href: '/dashboard/ai-review', icon: <Bot size={16} />, label: 'AI' },
  { href: '/dashboard/monitoring', icon: <BarChart3 size={16} />, label: 'Monitor' },
];

const WORKSPACES = [
  { id: 'prod-us', name: 'US Production Cluster', desc: 'AWS us-east-1 · 14 svcs', status: 'optimal' },
  { id: 'stage-us', name: 'US Staging-Env', desc: 'AWS us-east-1 · 12 svcs', status: 'optimal' },
  { id: 'local-dev', name: 'Local Dev Machine', desc: 'localhost · 8 svcs', status: 'warning' },
];

interface Props {
  children: React.ReactNode;
  session: Session;
}

export default function DashboardShell({ children, session }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, canAny, roleLabel, roleBadgeColor } = usePermissions();

  const [activeWorkspace, setActiveWorkspace] = useState(WORKSPACES[0]);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      text: 'Welcome back, Operator. I am DevIntel AI. I am monitoring 14 active Kubernetes clusters across US-East and EU-West. Current cluster health is 92%. Active pipeline data and anomaly detection profiles are synced. How can I assist you?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Detect mobile breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar or AI panel is open
  useEffect(() => {
    const locked = (isMobile && isSidebarOpen) || (isMobile && isAiAssistantOpen);
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, isSidebarOpen, isAiAssistantOpen]);

  const commands = [
    { category: 'Navigation', label: 'Go to System Overview', action: 'route', href: '/dashboard', icon: <Zap size={14} /> },
    { category: 'Navigation', label: 'Go to Pipelines & Builds', action: 'route', href: '/dashboard/pipelines', icon: <GitBranch size={14} /> },
    { category: 'Navigation', label: 'Go to Incident Feed', action: 'route', href: '/dashboard/incidents', icon: <AlertTriangle size={14} /> },
    { category: 'Navigation', label: 'Go to AI Review Records', action: 'route', href: '/dashboard/ai-review', icon: <Bot size={14} /> },
    { category: 'Navigation', label: 'Go to Governance Approvals', action: 'route', href: '/dashboard/governance', icon: <ShieldAlert size={14} /> },
    { category: 'Navigation', label: 'Go to Project Repositories', action: 'route', href: '/dashboard/projects', icon: <Folder size={14} /> },
    { category: 'Actions', label: 'Trigger AI Pipeline Run', action: 'trigger_pipeline', icon: <Rocket size={14} />, badge: 'Action' },
    { category: 'Actions', label: 'Run Incident Telemetry Correlation', action: 'correlate', icon: <Cpu size={14} />, badge: 'AI Action' },
    { category: 'Actions', label: 'Auto-scale data-processor-svc', action: 'scale', icon: <BarChart3 size={14} />, badge: 'Quick-fix' }
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(commandPaletteQuery.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(open => !open);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsAiAssistantOpen(open => !open);
      }
      if (isCommandPaletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCmdIndex(idx => (idx + 1) % filteredCommands.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCmdIndex(idx => (idx - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedCmdIndex]) handleExecuteCommand(filteredCommands[selectedCmdIndex]);
        } else if (e.key === 'Escape') {
          setIsCommandPaletteOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, filteredCommands, selectedCmdIndex]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleExecuteCommand = (cmd: typeof commands[0]) => {
    setIsCommandPaletteOpen(false);
    setCommandPaletteQuery('');
    if (cmd.action === 'route' && cmd.href) {
      router.push(cmd.href);
    } else {
      setIsAiAssistantOpen(true);
      setIsAiLoading(true);
      const userMsg = {
        id: Math.random().toString(),
        role: 'user',
        text: `Execute Action: ${cmd.label}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAiMessages(prev => [...prev, userMsg]);
      setTimeout(() => {
        setIsAiLoading(false);
        let respText = '';
        if (cmd.action === 'trigger_pipeline') {
          respText = '🔄 AI Review Pipeline has been triggered for branch main. Codebase static scanning and container lint tasks have started.';
        } else if (cmd.action === 'correlate') {
          respText = '🧠 Initiated telemetry logs correlation analysis. Analyzing Datadog charts, AWS Cloudwatch clusters, and active deployment events to compute Incident Root Cause hypothesis.';
        } else if (cmd.action === 'scale') {
          respText = '📈 Auto-scaled service data-processor-svc deployment replicas from 2 to 4 in AWS us-east-1. CPU usage is recovering back below threshold parameters.';
        }
        setAiMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          text: respText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }, 1000);
    }
  };

  const handleSendAiMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim() || isAiLoading) return;

    const userText = aiInputText;
    setAiInputText('');
    setAiMessages(prev => [...prev, {
      id: Math.random().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setIsAiLoading(true);

    setTimeout(() => {
      setIsAiLoading(false);
      let replyText = '';
      const lower = userText.toLowerCase();
      if (lower.includes('cpu') || lower.includes('anomaly') || lower.includes('incident') || lower.includes('alert')) {
        replyText = '🚨 Anomaly Profile Alert: Service `data-processor-svc` spiked to 85% CPU. Predictive analysis points to a memory leakage trace in the last commit. Recommended mitigation: scale to 4 replicas or trigger the manual rollback.';
      } else if (lower.includes('dora') || lower.includes('metric') || lower.includes('health')) {
        replyText = '📈 Active DORA Metrics: Deployment frequency is Daily (Elite), MTTR is 14 minutes (Optimal), and Change Failure Rate stands at 1.2%. General cluster reliability is stable at 92%.';
      } else if (lower.includes('rollback') || lower.includes('deploy')) {
        replyText = '🚀 Triggering manual rollback requires Governance policy override approvals. You can trigger and approve rollback events inside the Incidents control board.';
      } else if (lower.includes('clear')) {
        setAiMessages([{
          id: '1',
          role: 'assistant',
          text: 'Operational assistant messages log cleared. Standing by for diagnostics query...',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        return;
      } else {
        replyText = '🤖 Diagnostic Status: Connected to OpenAI GPT-4o and Claude 3.5 Sonnet. Scanning live Kubernetes events, pipeline logs, and governance approvals. Ask me about system health, anomalies, active incidents, or type "dora" to review team metrics.';
      }
      setAiMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1200);
  };

  // Compute right margin for main content based on AI panel state
  const mainRightMargin = isAiAssistantOpen && !isMobile ? 'var(--ai-panel-width)' : '0';

  return (
    <div className="layout" style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── Sidebar Overlay (mobile) ──────────────────────────────────────── */}
      {isMobile && (
        <div
          className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar Navigation ─────────────────────────────────────────────── */}
      <aside className={`sidebar ${isMobile && isSidebarOpen ? 'open' : ''}`}>
        <Link href="/" className="sidebar-logo" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
          <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} className="text-amber-500 fill-amber-500" />
          </div>
          <span>DevIntel<span className="gradient-text">AI</span></span>
        </Link>

        {/* Workspace Switcher */}
        <div style={{ padding: '0 0.25rem', position: 'relative' }}>
          <div className="workspace-switcher" onClick={() => setIsWorkspaceOpen(prev => !prev)}>
            <div className="workspace-details">
              <span className="workspace-title">{activeWorkspace.name}</span>
              <span className="workspace-subtitle">{activeWorkspace.desc}</span>
            </div>
            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', flexShrink: 0 }}>▼</span>
          </div>

          <AnimatePresence>
            {isWorkspaceOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  position: 'absolute',
                  width: 'calc(100% - 0.5rem)',
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem',
                  zIndex: 300,
                  boxShadow: 'var(--shadow-card)',
                  top: '100%',
                  left: '0.25rem',
                }}
              >
                {WORKSPACES.map(ws => (
                  <div
                    key={ws.id}
                    onClick={() => { setActiveWorkspace(ws); setIsWorkspaceOpen(false); }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      background: activeWorkspace.id === ws.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                      transition: 'var(--transition)'
                    }}
                    className="nav-item"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{ws.desc}</div>
                      </div>
                      <span className={`badge ${ws.status === 'optimal' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.5rem', padding: '2px 4px', flexShrink: 0 }}>
                        {ws.status}
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="nav-section-label">Pipeline Intelligence</p>
        {navItems.filter((item) => can((item as any).permission)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            title={item.label}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        <p className="nav-section-label">Configuration</p>
        {settingsItems.filter((item) => {
          if ((item as any).permissionAny) return canAny((item as any).permissionAny);
          if ((item as any).permission) return can((item as any).permission);
          return true;
        }).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            title={item.label}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="mt-auto">
          <div className="divider" style={{ margin: '1rem 0' }} />
          <div style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0, fontSize: '0.75rem' }}>
              OP
            </div>
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user?.name ?? 'Operator User'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', overflow: 'hidden' }}>
                <span className={`badge ${roleBadgeColor}`} style={{ fontSize: '0.5625rem', padding: '1px 5px', lineHeight: 1.4 }}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="nav-item"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', textAlign: 'left' }}
            title="Sign out"
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
              <LogOut size={16} />
            </span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ───────────────────────────────────────────────── */}
      <div
        className="main-content-layout"
        style={{ marginRight: mainRightMargin, transition: 'var(--transition-slow)' }}
      >
        {/* ── Operational Header ─────────────────────────────────────────── */}
        <header className="operational-header">
          <div className="flex items-center gap-3">
            {/* Hamburger — shown on mobile */}
            <button
              className="hamburger-btn"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>

            {/* Search / Command Palette trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="header-search-btn"
              aria-label="Open command palette"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={16} className="text-muted" /> Search or command...
              </span>
              <kbd className="command-palette-shortcut-hint" style={{ marginLeft: 'auto' }}>⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAiAssistantOpen(prev => !prev)}
              className="btn btn-secondary btn-sm"
              style={{
                border: isAiAssistantOpen ? '1px solid var(--accent-purple)' : '1px solid var(--border)',
                background: isAiAssistantOpen ? 'rgba(139,92,246,0.1)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              aria-label="Toggle AI Assistant"
            >
              <Bot size={16} />
              <span style={{ display: 'inline' }}>AI</span>
              <kbd className="command-palette-shortcut-hint">⌘J</kbd>
            </button>
          </div>
        </header>

        {/* ── Page Content ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: 'clamp(1rem, 3vw, 2rem)', paddingBottom: isMobile ? 'calc(var(--mobile-nav-height) + 1rem)' : 'clamp(1rem, 3vw, 2rem)' }}>
          {children}
        </div>
      </div>

      {/* ── AI Copilot Panel ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAiAssistantOpen && (
          <>
            {/* Mobile overlay for AI panel */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 149 }}
                onClick={() => setIsAiAssistantOpen(false)}
              />
            )}
            <motion.div
              initial={isMobile ? { y: '100%' } : { x: 'var(--ai-panel-width)', opacity: 0.8 }}
              animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
              exit={isMobile ? { y: '100%' } : { x: 'var(--ai-panel-width)', opacity: 0.8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="ai-panel-wrapper"
            >
              <div className="ai-panel-header">
                <div className="ai-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bot size={18} className="text-purple-400" />
                  <span>DevIntel AI Copilot</span>
                </div>
                <button
                  onClick={() => setIsAiAssistantOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}
                  aria-label="Close AI panel"
                >
                  ✕
                </button>
              </div>

              <div className="ai-panel-chat-area">
                {aiMessages.map(msg => (
                  <div key={msg.id} className={`ai-chat-bubble ${msg.role}`}>
                    {msg.text}
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {msg.timestamp}
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="ai-chat-bubble assistant skeleton" style={{ width: 140, height: 40, border: 'none' }} />
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ padding: '0 1.25rem 0.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', flexShrink: 0 }}>
                <button onClick={() => setAiInputText('Summary active incidents')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', borderRadius: 4, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertTriangle size={12} className="text-red-500" /> Incidents
                </button>
                <button onClick={() => setAiInputText('Show active DORA health indicators')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', borderRadius: 4, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <BarChart3 size={12} className="text-cyan-500" /> DORA Stats
                </button>
              </div>

              <form onSubmit={handleSendAiMessage} className="ai-panel-input-wrapper">
                <input
                  type="text"
                  placeholder="Ask AI Copilot for diagnostics..."
                  value={aiInputText}
                  onChange={e => setAiInputText(e.target.value)}
                  className="ai-panel-input"
                />
                <button type="submit" className="ai-panel-send-btn" aria-label="Send" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={14} />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Navigation ─────────────────────────────────────── */}
      <nav className="mobile-bottom-nav" style={{ display: isMobile ? 'flex' : 'none' }}>
        {mobileNavItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* ── Command Palette Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="command-palette-backdrop"
            onClick={() => setIsCommandPaletteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              className="command-palette-box"
              onClick={e => e.stopPropagation()}
            >
              <div className="command-palette-search-wrapper">
                <Search size={18} className="text-muted" style={{ marginRight: '0.5rem' }} />
                <input
                  type="text"
                  placeholder="Search routes, pipeline actions, or quick fixes..."
                  value={commandPaletteQuery}
                  onChange={e => { setCommandPaletteQuery(e.target.value); setSelectedCmdIndex(0); }}
                  className="command-palette-input"
                  autoFocus
                />
                <kbd className="command-palette-shortcut-hint">ESC</kbd>
              </div>

              <div className="command-palette-results">
                {filteredCommands.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No operations match your query.
                  </div>
                ) : (
                  <div>
                    {['Navigation', 'Actions'].map(cat => {
                      const catCommands = filteredCommands.filter(c => c.category === cat);
                      if (catCommands.length === 0) return null;
                      return (
                        <div key={cat} className="command-palette-group">
                          <div className="command-palette-group-title">{cat}</div>
                          {catCommands.map(cmd => {
                            const absoluteIndex = filteredCommands.indexOf(cmd);
                            return (
                              <div
                                key={cmd.label}
                                className={`command-palette-item ${selectedCmdIndex === absoluteIndex ? 'selected' : ''}`}
                                onClick={() => handleExecuteCommand(cmd)}
                                onMouseEnter={() => setSelectedCmdIndex(absoluteIndex)}
                              >
                                <div className="command-palette-item-left">
                                  <span className="command-palette-item-icon">{cmd.icon}</span>
                                  <span className="command-palette-item-label">{cmd.label}</span>
                                </div>
                                {cmd.badge && (
                                  <span className="command-palette-item-badge">{cmd.badge}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)', display: 'flex', gap: '1rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                <span>↑↓ Navigate</span>
                <span>Enter Select</span>
                <span>Esc Dismiss</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
