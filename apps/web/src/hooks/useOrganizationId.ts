'use client';
import { useSession } from 'next-auth/react';

/**
 * Returns the current user's organizationId from the NextAuth session.
 *
 * Use this hook instead of hardcoding an organization ID to ensure
 * data is properly scoped per user/organization.
 */
export function useOrganizationId(): string {
  const { data: session } = useSession();
  return (session as any)?.organizationId ?? '';
}
