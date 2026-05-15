import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
