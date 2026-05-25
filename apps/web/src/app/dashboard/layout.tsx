import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardShell from './shell';
import type { Session } from 'next-auth';

// ─── Dev bypass session ───────────────────────────────────────────────────────
// When NEXTAUTH_DEV_BYPASS=true, skip auth and inject a mock session so the
// dashboard is accessible without configured OAuth credentials.

const DEV_BYPASS = process.env.NEXTAUTH_DEV_BYPASS === 'true' || process.env.NODE_ENV === 'development';

const DEV_SESSION: Session = {
  user: {
    id: 'dev-user',
    name: 'Dev User',
    email: 'dev@aidevops.local',
    image: null,
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session: Session | null = null;

  if (DEV_BYPASS) {
    // Allow unauthenticated dev access — use mock session
    session = DEV_SESSION;
  } else {
    session = await auth();
    if (!session) {
      redirect('/api/auth/signin');
    }
  }

  return <DashboardShell session={session!}>{children}</DashboardShell>;
}
