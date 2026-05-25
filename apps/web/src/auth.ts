import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'ochhExgjtTPvCk/Dqpb0zkAGtQgdOeNV+2XGhsFPo/4=',
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
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
    async jwt({ token, account }) {
      // Persist the Google access token and user info on first sign-in
      if (account) {
        token.accessToken = account.access_token;
        token.organizationId = 'default-org'; // will be replaced when we add multi-tenancy
        token.role = 'admin';
      }
      return token;
    },

    async session({ session, token }) {
      // Expose fields to the client session
      session.user.id = token.sub!;
      (session as any).accessToken = token.accessToken;
      (session as any).organizationId = token.organizationId;
      (session as any).role = token.role;
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});
