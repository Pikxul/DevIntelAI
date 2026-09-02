'use client';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { hasPermission, hasAnyPermission, hasAllPermissions, ROLE_LABELS, ROLE_BADGE_COLORS } from '@/lib/permissions';

/**
 * React hook that reads the user's role from the NextAuth session
 * and exposes permission-checking helpers.
 *
 * In development mode, the role can be overridden via the `?__dev_role=`
 * query parameter to enable E2E testing of different roles.
 *
 * Usage:
 *   const { can, canAny, role } = usePermissions();
 *   if (can('pipeline:trigger')) { ... }
 */
export function usePermissions() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // Dev-only role override via ?__dev_role=viewer (ignored in production)
  const devRoleOverride =
    process.env.NODE_ENV === 'development'
      ? searchParams?.get('__dev_role') ?? null
      : null;

  const role: string = devRoleOverride || (session as any)?.role || '';

  return {
    /** The raw role string (e.g. 'admin', 'developer', 'viewer') */
    role,

    /** Human-readable role label (e.g. 'DevOps Engineer') */
    roleLabel: ROLE_LABELS[role.toLowerCase()] ?? role,

    /** CSS badge class for the role */
    roleBadgeColor: ROLE_BADGE_COLORS[role.toLowerCase()] ?? 'badge-neutral',

    /** Check if the user has a specific permission */
    can: (permission: string): boolean => hasPermission(role, permission),

    /** Check if the user has ANY of the given permissions */
    canAny: (permissions: string[]): boolean => hasAnyPermission(role, permissions),

    /** Check if the user has ALL of the given permissions */
    canAll: (permissions: string[]): boolean => hasAllPermissions(role, permissions),

    /** Whether the session is loaded */
    isLoaded: !!session,
  };
}
