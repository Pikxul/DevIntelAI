/**
 * Internal API route: exchanges the NextAuth session JWT for a token
 * the NestJS backend can verify (uses the same NEXTAUTH_SECRET / JWT_SECRET).
 *
 * The client calls GET /api/auth/token → receives { token: "<jwt>" }
 * and uses it as `Authorization: Bearer <token>` on API requests.
 */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function GET() {
  const session = await auth();

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'ochhExgjtTPvCk/Dqpb0zkAGtQgdOeNV+2XGhsFPo/4=';
  const encodedSecret = new TextEncoder().encode(secret);

  if (!session?.user) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  // Generate standard JWT that NestJS's passport-jwt can verify
  const token = await new SignJWT({
    sub: session.user.id,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
    org: (session as any).organizationId ?? 'default-org',
    role: (session as any).role ?? 'user',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(encodedSecret);

  return NextResponse.json({ token });
}
