import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

/** Protects all /onboarding/* routes — requires login but does NOT check
 * onboarding completion (that would create a redirect loop). */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  let session = await auth();

  // In development, provide a fallback session if NextAuth session is absent
  if (!session && process.env.NODE_ENV === 'development') {
    session = {
      user: {
        id: 'dev-user-001',
        name: 'John',
        email: 'john@acme.com',
        image: null,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any;
  }

  if (!session) redirect('/auth/signin');
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}
