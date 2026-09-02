/**
 * Client-side permission map — mirrors the backend's ROLE_PERMISSION_SEED
 * from apps/api/src/modules/auth/permissions.service.ts
 *
 * This is used ONLY for UI gating (hiding/showing nav items, buttons, etc.).
 * The backend remains the authoritative enforcer via PermissionsGuard.
 */

export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  owner: [
    // Full access — org management
    'org:create', 'org:delete', 'org:settings',
    'user:invite', 'user:remove', 'user:assign_role',
    'sso:configure',
    'billing:manage',
    // Full access — operational
    'repo:connect', 'repo:manage', 'repo:view',
    'pipeline:view', 'pipeline:trigger', 'pipeline:manage',
    'deployment:view', 'deployment:rollback',
    'ai_review:view',
    'incident:view', 'incident:manage',
    'rca:view',
    'alert:view', 'alert:manage',
    'monitoring:view',
    'dora:view',
    'policy:read', 'policy:write',
    'governance:view',
    'compliance:view',
    'audit_log:view',
    'dashboard:view',
    'analytics:view',
    'report:view',
    'approval:review',
  ],

  admin: [
    'user:invite', 'user:remove', 'user:assign_role',
    'repo:connect', 'repo:manage', 'repo:view',
    'pipeline:view', 'pipeline:trigger', 'pipeline:manage',
    'deployment:view', 'deployment:rollback',
    'ai_review:view',
    'incident:view', 'incident:manage',
    'rca:view',
    'alert:view', 'alert:manage',
    'monitoring:view',
    'dora:view',
    'policy:read', 'policy:write',
    'governance:view',
    'compliance:view',
    'audit_log:view',
    'dashboard:view',
    'analytics:view',
    'report:view',
    'approval:review',
  ],

  devops_engineer: [
    'repo:connect', 'repo:manage', 'repo:view',
    'pipeline:view', 'pipeline:trigger', 'pipeline:manage',
    'deployment:view', 'deployment:rollback',
    'ai_review:view',
    'incident:view',
    'monitoring:view',
    'dora:view',
    'dashboard:view',
    'analytics:view',
  ],

  sre_engineer: [
    'incident:view', 'incident:manage',
    'rca:view',
    'alert:view', 'alert:manage',
    'monitoring:view',
    'dora:view',
    'deployment:view',
    'pipeline:view',
    'dashboard:view',
    'analytics:view',
  ],

  security_engineer: [
    'policy:read', 'policy:write',
    'governance:view',
    'compliance:view',
    'audit_log:view',
    'ai_review:view',
    'incident:view',
    'dashboard:view',
    'analytics:view',
  ],

  developer: [
    'repo:view',
    'pipeline:view',
    'deployment:view',
    'ai_review:view',
    'dashboard:view',
  ],

  viewer: [
    'dashboard:view',
    'analytics:view',
    'dora:view',
    'report:view',
  ],
} as const;

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: string | undefined | null, permission: string): boolean {
  if (!role) return false;
  const normalised = role.toLowerCase();
  const perms = ROLE_PERMISSIONS[normalised];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Check if a role has ANY of the given permissions (OR logic).
 */
export function hasAnyPermission(role: string | undefined | null, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Check if a role has ALL of the given permissions (AND logic).
 */
export function hasAllPermissions(role: string | undefined | null, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a given role.
 */
export function getPermissionsForRole(role: string | undefined | null): string[] {
  if (!role) return [];
  return [...(ROLE_PERMISSIONS[role.toLowerCase()] ?? [])];
}

/**
 * Human-readable role label mapping.
 */
export const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  devops_engineer: 'DevOps Engineer',
  sre_engineer: 'SRE Engineer',
  security_engineer: 'Security Engineer',
  developer: 'Developer',
  viewer: 'Viewer',
};

/**
 * Role badge color mapping (CSS class).
 */
export const ROLE_BADGE_COLORS: Record<string, string> = {
  owner: 'badge-danger',
  admin: 'badge-warning',
  devops_engineer: 'badge-info',
  sre_engineer: 'badge-info',
  security_engineer: 'badge-success',
  developer: 'badge-neutral',
  viewer: 'badge-neutral',
};
