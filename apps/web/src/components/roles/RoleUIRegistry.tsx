'use client';

import React from 'react';
import OwnerApplication from './OwnerApplication';
import AdminApplication from './AdminApplication';
import DeveloperApplication from './DeveloperApplication';
import AnalystApplication from './AnalystApplication';
import EngineeringApplication from './EngineeringApplication';
import ViewerApplication from './ViewerApplication';
import RoleFallbackApplication from './RoleFallbackApplication';

export {
  OwnerApplication,
  AdminApplication,
  DeveloperApplication,
  AnalystApplication,
  EngineeringApplication,
  ViewerApplication,
  RoleFallbackApplication,
};

// Re-export helper configs and metadata from lib/RoleUIRegistry
export {
  ROLE_CONFIGS,
  getRoleConfig,
  getRoleQuickActions,
  getRoleNavSections,
  isManagementRole,
} from '@/lib/RoleUIRegistry';
export type { RoleApplicationConfig, QuickAction } from '@/lib/RoleUIRegistry';

export type RoleApplicationComponent = React.ComponentType<{ role?: string }>;

const ROLE_APPLICATION_MAP: Record<string, RoleApplicationComponent> = {
  owner: OwnerApplication,
  admin: AdminApplication,
  developer: DeveloperApplication,
  analyst: AnalystApplication,
  devops_engineer: EngineeringApplication,
  sre_engineer: EngineeringApplication,
  security_engineer: EngineeringApplication,
  viewer: ViewerApplication,
};

/**
 * Resolves the authenticated user's role to the appropriate
 * dedicated application component tree. Returns RoleFallbackApplication
 * for unknown or unsupported roles.
 */
export function getRoleApplication(role: string | undefined | null): RoleApplicationComponent {
  if (!role) {
    return ViewerApplication;
  }
  const normalised = role.toLowerCase().trim();
  const component = ROLE_APPLICATION_MAP[normalised];
  if (!component) {
    return function FallbackWrapper() {
      return <RoleFallbackApplication role={role} />;
    };
  }
  return component;
}
