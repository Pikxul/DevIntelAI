'use client';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  /**
   * Single permission (or array where ALL must match) required to render children.
   * Use `requireAny` instead if OR logic is needed.
   */
  require?: string | string[];

  /**
   * Array of permissions where ANY match is sufficient to render children.
   */
  requireAny?: string[];

  /**
   * Optional fallback JSX to render when the user lacks permission.
   * If omitted, nothing is rendered (component is hidden).
   */
  fallback?: React.ReactNode;

  children: React.ReactNode;
}

/**
 * Declarative permission wrapper.
 *
 * Renders its children only if the current user's role satisfies
 * the permission requirements. Otherwise renders the fallback (or nothing).
 *
 * @example
 * ```tsx
 * <PermissionGate require="pipeline:trigger">
 *   <button>Trigger Pipeline</button>
 * </PermissionGate>
 *
 * <PermissionGate requireAny={['policy:read', 'governance:view']} fallback={<AccessDenied />}>
 *   <PolicyList />
 * </PermissionGate>
 * ```
 */
export default function PermissionGate({ require, requireAny, fallback = null, children }: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();

  let allowed = true;

  if (require) {
    if (Array.isArray(require)) {
      allowed = canAll(require);
    } else {
      allowed = can(require);
    }
  }

  if (requireAny) {
    allowed = allowed && canAny(requireAny);
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
