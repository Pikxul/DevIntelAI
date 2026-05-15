import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardShell from './shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/signin');
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}
