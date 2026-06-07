import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

/** Protects all /onboarding/* routes — requires login but does NOT check
 * onboarding completion (that would create a redirect loop). */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect('/auth/signin');
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}
