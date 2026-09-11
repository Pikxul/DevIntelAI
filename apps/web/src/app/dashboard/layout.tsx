import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import DashboardShell from './shell';
import type { Session } from 'next-auth';
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session = await auth();
  if (!session && (process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEV_BYPASS === 'true')) {
    session = {
      user: {
        id: 'dev-user',
        name: 'John (CTO - Acme Corp)',
        email: 'john@acme.com',
        image: null,
      },
      role: 'owner',
      organizationId: 'org-acme-corp',
      expires: new Date(Date.now() + 86_400_000).toISOString(),
    } as any;
  }

  if (!session) {
    redirect('/auth/signin');
  }

  // ── Onboarding gate ──────────────────────────────────────────────────────
  // Redirect to onboarding if:
  //   1. The user just signed up (isNewUser=true in JWT), AND
  //   2. They have no organization yet (organizationId is missing), AND
  //   3. The onboarding_complete cookie hasn't been set
  const cookieStore = await cookies();
  const onboardingDone = cookieStore.get('onboarding_complete')?.value === '1';
  const isNewUser = (session as any)?.isNewUser === true;
  const hasOrg = !!(session as any)?.organizationId;

  if (isNewUser && !hasOrg && !onboardingDone) {
    redirect('/onboarding');
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}
