'use client';

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { getRoleApplication } from '@/components/roles/RoleUIRegistry';

export default function DashboardPage() {
  const { role } = usePermissions();
  const RoleComponent = getRoleApplication(role);

  return <RoleComponent role={role} />;
}
