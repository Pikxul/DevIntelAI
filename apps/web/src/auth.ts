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
        // Dummy dev user
        return { id: 'dev-user-id', name: 'Dev User', email: 'dev@acme.com', image: 'https://github.com/shadcn.png' };
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
        token.organizationId = 'default-org'; // will be replaced when we add multi-tenancy
        token.role = 'admin';
        
        if (account.provider === 'github' || account.provider === 'google' || account.provider === 'credentials') {
          try {
            const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? 'ochhExgjtTPvCk/Dqpb0zkAGtQgdOeNV+2XGhsFPo/4=';
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
            const endpoint = account.provider === 'github' ? 'github-callback' : account.provider === 'google' ? 'google-callback' : 'credentials-callback';
            
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
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});
