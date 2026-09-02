/**
 * Role simulation fixtures for E2E permission testing.
 *
 * Appends `?__dev_role=<role>` to URLs so that the `usePermissions()` hook
 * picks up the overridden role in development mode.
 */
import { ROLE_PERMISSIONS } from '../../src/lib/permissions';

/** All 7 roles defined in the permissions system */
export const ALL_ROLES = [
  'owner',
  'admin',
  'devops_engineer',
  'sre_engineer',
  'security_engineer',
  'developer',
  'viewer',
] as const;

export type Role = (typeof ALL_ROLES)[number];

/** Human-readable labels for each role */
export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  devops_engineer: 'DevOps Engineer',
  sre_engineer: 'SRE Engineer',
  security_engineer: 'Security Engineer',
  developer: 'Developer',
  viewer: 'Viewer',
};

/**
 * Append the dev role override query parameter to a URL.
 * Preserves any existing query parameters.
 */
export function withRole(url: string, role: Role): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}__dev_role=${role}`;
}

/**
 * Check whether a role has a specific permission.
 * Mirrors the client-side `hasPermission()`.
 */
export function roleHasPermission(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}

/**
 * Check whether a role has ANY of the given permissions.
 */
export function roleHasAnyPermission(role: Role, permissions: string[]): boolean {
  return permissions.some((p) => roleHasPermission(role, p));
}

/**
 * Sidebar nav items and their required permissions.
 * Mirrors the navItems array from shell.tsx.
 */
export const SIDEBAR_NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', permission: 'dashboard:view' },
  { label: 'Pipelines', href: '/dashboard/pipelines', permission: 'pipeline:view' },
  { label: 'AI Review', href: '/dashboard/ai-review', permission: 'ai_review:view' },
  { label: 'Deployments', href: '/dashboard/deployments', permission: 'deployment:view' },
  { label: 'Incidents', href: '/dashboard/incidents', permission: 'incident:view' },
  { label: 'Observability', href: '/dashboard/monitoring', permission: 'monitoring:view' },
  { label: 'Governance', href: '/dashboard/governance', permission: 'governance:view' },
] as const;

export const SIDEBAR_SETTINGS_ITEMS = [
  { label: 'Projects', href: '/dashboard/projects', permissionAny: ['repo:connect', 'repo:view'] },
  { label: 'Settings', href: '/dashboard/settings', permission: 'org:settings' },
] as const;

/** Base URL for all dashboard tests */
export const BASE_URL = 'http://localhost:3000';
