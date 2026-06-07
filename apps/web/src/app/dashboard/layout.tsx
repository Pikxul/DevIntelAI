import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import DashboardShell from './shell';
import type { Session } from 'next-auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect('/auth/signin');
  }

  // ── Onboarding gate ──────────────────────────────────────────────────────
  // If the user just signed up (isNewUser=true in JWT) and hasn't yet
  // completed the onboarding wizard, redirect them to /onboarding.
  // The cookie 'onboarding_complete' is set by /api/github/callback when the
  // GitHub App is installed — it overrides the JWT flag for the cookie TTL.
  const cookieStore = await cookies();
  const onboardingDone = cookieStore.get('onboarding_complete')?.value === '1';
  const isNewUser = (session as any)?.isNewUser === true;

  if (isNewUser && !onboardingDone) {
    redirect('/onboarding');
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}
