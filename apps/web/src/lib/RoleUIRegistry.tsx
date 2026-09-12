'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission, ROLE_LABELS } from '@/lib/permissions';
import { 
  Crown, Shield, Wrench, Code, BarChart3, Eye, 
  Users, Settings, GitBranch, Activity, AlertTriangle, 
  FileSearch, Gauge, BookOpen, Lock, CheckCircle
} from 'lucide-react';

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface RoleApplicationConfig {
  role: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  quickActions: QuickAction[];
  navSections: string[];
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
  description: string;
}

/* ─── Role Application Configs ─────────────────────────────────────────────── */

const ROLE_CONFIGS: Record<string, RoleApplicationConfig> = {
  owner: {
    role: 'owner',
    label: 'Owner Dashboard',
    icon: <Crown size={20} />,
    description: 'Full organizational control — team, billing, settings, and all operations',
    color: '#f59e0b',
    quickActions: [
      { label: 'Manage Team', href: '/dashboard/team', icon: <Users size={18} />, description: 'Invite members, assign roles' },
      { label: 'Organization Settings', href: '/dashboard/settings', icon: <Settings size={18} />, description: 'Configure your organization' },
      { label: 'Pipelines', href: '/dashboard/pipelines', icon: <GitBranch size={18} />, description: 'View CI/CD pipelines' },
      { label: 'DORA Metrics', href: '/dashboard/dora', icon: <Gauge size={18} />, description: 'Engineering performance' },
      { label: 'Governance', href: '/dashboard/governance', icon: <BookOpen size={18} />, description: 'Policies & compliance' },
      { label: 'Audit Logs', href: '/dashboard/settings', icon: <FileSearch size={18} />, description: 'Activity trail' },
    ],
    navSections: ['team', 'pipelines', 'deployments', 'monitoring', 'incidents', 'dora', 'governance', 'settings'],
  },

  admin: {
    role: 'admin',
    label: 'Admin Dashboard',
    icon: <Shield size={20} />,
    description: 'Team management and full operational access',
    color: '#818cf8',
    quickActions: [
      { label: 'Manage Team', href: '/dashboard/team', icon: <Users size={18} />, description: 'Invite members, assign roles' },
      { label: 'Pipelines', href: '/dashboard/pipelines', icon: <GitBranch size={18} />, description: 'View CI/CD pipelines' },
      { label: 'DORA Metrics', href: '/dashboard/dora', icon: <Gauge size={18} />, description: 'Engineering performance' },
      { label: 'Governance', href: '/dashboard/governance', icon: <BookOpen size={18} />, description: 'Policies & compliance' },
    ],
    navSections: ['team', 'pipelines', 'deployments', 'monitoring', 'incidents', 'dora', 'governance', 'settings'],
  },

  devops_engineer: {
    role: 'devops_engineer',
    label: 'DevOps Dashboard',
    icon: <Wrench size={20} />,
    description: 'Pipeline management, deployments, and infrastructure operations',
    color: '#06b6d4',
    quickActions: [
      { label: 'Pipelines', href: '/dashboard/pipelines', icon: <GitBranch size={18} />, description: 'Manage CI/CD pipelines' },
      { label: 'Deployments', href: '/dashboard/deployments', icon: <Activity size={18} />, description: 'Monitor deployments' },
      { label: 'Monitoring', href: '/dashboard/monitoring', icon: <Gauge size={18} />, description: 'System health' },
      { label: 'DORA Metrics', href: '/dashboard/dora', icon: <BarChart3 size={18} />, description: 'Engineering metrics' },
    ],
    navSections: ['pipelines', 'deployments', 'monitoring', 'dora'],
  },

  sre_engineer: {
    role: 'sre_engineer',
    label: 'SRE Dashboard',
    icon: <AlertTriangle size={20} />,
    description: 'Incident management, monitoring, and reliability engineering',
    color: '#ef4444',
    quickActions: [
      { label: 'Incidents', href: '/dashboard/incidents', icon: <AlertTriangle size={18} />, description: 'Active incidents' },
      { label: 'Monitoring', href: '/dashboard/monitoring', icon: <Gauge size={18} />, description: 'System health' },
      { label: 'DORA Metrics', href: '/dashboard/dora', icon: <BarChart3 size={18} />, description: 'Reliability metrics' },
      { label: 'Deployments', href: '/dashboard/deployments', icon: <Activity size={18} />, description: 'Deployment status' },
    ],
    navSections: ['incidents', 'monitoring', 'deployments', 'pipelines', 'dora'],
  },

  security_engineer: {
    role: 'security_engineer',
    label: 'Security Dashboard',
    icon: <Lock size={20} />,
    description: 'Security policies, compliance, and audit oversight',
    color: '#10b981',
    quickActions: [
      { label: 'Governance', href: '/dashboard/governance', icon: <BookOpen size={18} />, description: 'Security policies' },
      { label: 'AI Reviews', href: '/dashboard/pipelines', icon: <CheckCircle size={18} />, description: 'AI code review results' },
      { label: 'Incidents', href: '/dashboard/incidents', icon: <AlertTriangle size={18} />, description: 'Security incidents' },
    ],
    navSections: ['governance', 'pipelines', 'incidents'],
  },

  developer: {
    role: 'developer',
    label: 'Developer Dashboard',
    icon: <Code size={20} />,
    description: 'Pipeline visibility, deployments, and code review insights',
    color: '#a78bfa',
    quickActions: [
      { label: 'Pipelines', href: '/dashboard/pipelines', icon: <GitBranch size={18} />, description: 'Your pipelines' },
      { label: 'Deployments', href: '/dashboard/deployments', icon: <Activity size={18} />, description: 'Deployment status' },
      { label: 'AI Reviews', href: '/dashboard/pipelines', icon: <CheckCircle size={18} />, description: 'AI code review results' },
    ],
    navSections: ['pipelines', 'deployments'],
  },

  analyst: {
    role: 'analyst',
    label: 'Analyst Dashboard',
    icon: <BarChart3 size={20} />,
    description: 'Analytics, reporting, compliance, and monitoring data',
    color: '#f97316',
    quickActions: [
      { label: 'DORA Metrics', href: '/dashboard/dora', icon: <Gauge size={18} />, description: 'Engineering metrics' },
      { label: 'Monitoring', href: '/dashboard/monitoring', icon: <Activity size={18} />, description: 'System health data' },
      { label: 'Governance', href: '/dashboard/governance', icon: <BookOpen size={18} />, description: 'Compliance reports' },
    ],
    navSections: ['dora', 'monitoring', 'governance'],
  },

  viewer: {
    role: 'viewer',
    label: 'Viewer Dashboard',
    icon: <Eye size={20} />,
    description: 'Read-only access to dashboards, analytics, and reports',
    color: '#64748b',
    quickActions: [
      { label: 'DORA Metrics', href: '/dashboard/dora', icon: <Gauge size={18} />, description: 'Engineering metrics' },
      { label: 'Analytics', href: '/dashboard', icon: <BarChart3 size={18} />, description: 'View analytics' },
    ],
    navSections: ['dora'],
  },
};

/* ─── Registry Functions ───────────────────────────────────────────────────── */

export function getRoleConfig(role: string | undefined | null): RoleApplicationConfig {
  if (!role) return ROLE_CONFIGS.viewer;
  return ROLE_CONFIGS[role.toLowerCase()] ?? ROLE_CONFIGS.viewer;
}

export function getRoleQuickActions(role: string | undefined | null): QuickAction[] {
  const config = getRoleConfig(role);
  return config.quickActions;
}

export function getRoleNavSections(role: string | undefined | null): string[] {
  const config = getRoleConfig(role);
  return config.navSections;
}

export function isManagementRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return ['owner', 'admin'].includes(role.toLowerCase());
}

export { ROLE_CONFIGS };
export type { RoleApplicationConfig, QuickAction };
