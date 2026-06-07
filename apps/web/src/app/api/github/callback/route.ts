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

    // 2. Mark the user's onboarding as complete
    const completeRes = await fetch(`${backendUrl}/api/v1/organizations/complete-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.accessToken}`,
      },
    });

    if (!completeRes.ok) {
      console.warn(`Failed to mark onboarding complete: ${await completeRes.text()}`);
    }

    // 3. Set a cookie to immediately bypass the onboarding gate in layout.tsx 
    //    (since the JWT token isNewUser flag might take a bit to refresh)
    const cookieStore = await cookies();
    cookieStore.set('onboarding_complete', '1', {
      path: '/',
      maxAge: 86400, // 24 hours
      sameSite: 'lax',
    });

    // 4. Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('GitHub App callback error:', error);
    return NextResponse.redirect(new URL('/dashboard?error=GitHubAppInstallFailed', request.url));
  }
}
