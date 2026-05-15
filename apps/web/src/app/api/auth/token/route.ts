/**
 * Internal API route: exchanges the NextAuth session JWT for a token
 * the NestJS backend can verify (uses the same NEXTAUTH_SECRET / JWT_SECRET).
 *
 * The client calls GET /api/auth/token → receives { token: "<jwt>" }
 * and uses it as `Authorization: Bearer <token>` on API requests.
 */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  // Re-encode the session payload as a JWT the NestJS API can verify
  // NestJS jwt.strategy uses NEXTAUTH_SECRET — same key, same algo (HS256)
  const token = await encode({
    token: {
      sub: session.user.id,
      email: session.user.email ?? '',
      name: session.user.name ?? '',
      org: (session as any).organizationId ?? 'default-org',
      role: (session as any).role ?? 'user',
    },
    secret: process.env.NEXTAUTH_SECRET!,
  });

  return NextResponse.json({ token });
}
