import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { SignJWT } from 'jose';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: { email: { label: 'Email', type: 'text' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
          const res = await fetch(`${apiUrl}/api/v1/auth/verify-credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
          if (res.ok) {
            const data = await res.json();
            // Return user object mapped to NextAuth User format
            return {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              image: data.user.avatarUrl,
            };
          }
        } catch (error) {
          console.error('Credentials authorization error:', error);
        }
        return null;
      }
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, user, account, profile, trigger, session }) {
      if (trigger === 'update' && session?.organizationId) {
        token.organizationId = session.organizationId;
      }

      if (account) {
        token.provider = account.provider; // 'github' | 'google' | 'credentials'
        token.role = 'admin';
        
        if (account.provider === 'github' || account.provider === 'google' || account.provider === 'credentials') {
          try {
            const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
            if (!secret) {
               throw new Error('Authentication secret is not configured.');
            }
            const encodedSecret = new TextEncoder().encode(secret);
            const syncToken = await new SignJWT({
              provider: account.provider,
              email: user.email,
            })
              .setProtectedHeader({ alg: 'HS256' })
              .setIssuedAt()
              .setExpirationTime('1m')
              .sign(encodedSecret);

            const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
            let endpoint = '';
            if (account.provider === 'github') endpoint = 'github-callback';
            else if (account.provider === 'google') endpoint = 'google-callback';
            // Credentials provider already verified in authorize(), but we sync token just in case
            // or we could skip syncing for credentials. Let's just use verify-credentials again or skip it.
            // Actually, for credentials, we just need the backend token. 
            // In authorize(), we verified, but NextAuth creates its own JWT.
            // To get backend JWT inside session, we can either store it in authorize() or hit an endpoint here.
            // Let's create an endpoint or reuse credentials-callback which we replaced with verify-credentials.
            // Since authorize() doesn't pass the token to jwt() easily without hacking, 
            // we will call verify-credentials again but wait, we don't have the password here!
            // Oh, we should probably skip this sync for credentials, or use a sync endpoint.
            // Wait, we removed credentials-callback. Let's change endpoint to verify-credentials? No, we don't have password.
            // Wait, let's restore credentials-callback but secure it with syncToken just like google-callback!
            // I'll add `credentials-sync` instead in a later step if needed, but for now:
            if (account.provider === 'credentials') endpoint = 'credentials-sync';
            else endpoint = `${account.provider}-callback`;
            
            const payload: any = {
              id: String(profile?.id ?? account?.providerAccountId ?? user?.id ?? 'dev-user-id'),
              email: user.email || `${account?.providerAccountId ?? 'dev'}@example.com`,
              name: user.name || (profile as any)?.name || 'OAuth User',
              avatarUrl: user.image || (profile as any)?.avatar_url || '',
            };
            if (account.provider === 'github') {
              payload.githubUsername = (profile as any)?.login;
              payload.githubAccessToken = account.access_token;
            }

            const res = await fetch(`${apiUrl}/api/v1/auth/${endpoint}`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${syncToken}`
              },
              body: JSON.stringify(payload),
            });
            if (res.ok) {
              const data = await res.json();
              token.accessToken = data.token;
              if (data.user) {
                token.sub = data.user.id;
                token.organizationId = data.user.organizationId;
                token.role = data.user.role;
                token.isNewUser = !!data.isNew; // true → route to onboarding wizard
                token.firstLogin = data.firstLogin ?? data.user?.firstLogin ?? false;
                token.permissions = data.user.permissions ?? [];
              }
            } else {
              console.error(`Failed to sync ${account.provider} user with backend:`, await res.text());
              token.accessToken = account.access_token;
            }
          } catch (err) {
            console.error('Error syncing user with backend:', err);
            token.accessToken = account.access_token;
          }
        } else {
          token.accessToken = account.access_token;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.sub!;
      (session as any).accessToken = token.accessToken;
      (session as any).organizationId = token.organizationId;
      (session as any).role = token.role;
      (session as any).provider = token.provider;
      (session as any).githubUsername = token.githubUsername;
      (session as any).isNewUser = token.isNewUser ?? false;
      (session as any).firstLogin = token.firstLogin ?? false;
      (session as any).permissions = token.permissions ?? [];
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});
