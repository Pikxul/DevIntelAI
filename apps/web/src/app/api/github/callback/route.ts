import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const installationId = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action'); // usually 'install' or 'update'

  // Get NextAuth token to retrieve the user's organization and JWT for backend calls
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET });

  if (!token) {
    console.error('No session token found in GitHub callback');
    return NextResponse.redirect(new URL('/auth/signin?error=SessionExpired', request.url));
  }

  try {
    const orgId = token.organizationId as string;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // 1. If installation ID was provided, save it to the organization
    if (installationId && orgId) {
      const updateRes = await fetch(`${backendUrl}/api/v1/organizations/${orgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.accessToken}`,
        },
        body: JSON.stringify({ githubInstallationId: parseInt(installationId, 10) }),
      });

      if (!updateRes.ok) {
        throw new Error(`Failed to update org with installation ID: ${await updateRes.text()}`);
      }
    }

    // 2. We no longer mark the user's onboarding as complete here
    // It will be marked complete after repository selection

    // 3. Redirect to select-repos
    return NextResponse.redirect(new URL('/onboarding/select-repos', request.url));
  } catch (error) {
    console.error('GitHub App callback error:', error);
    return NextResponse.redirect(new URL('/dashboard?error=GitHubAppInstallFailed', request.url));
  }
}
