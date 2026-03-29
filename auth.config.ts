import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

const gmailOnly = process.env.AUTH_GMAIL_ONLY === "true";

/**
 * Edge-safe Auth.js config (no Prisma). Used by middleware.
 * Must stay in sync with session/JWT behavior in auth.ts.
 */
export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    async signIn({ user }) {
      if (gmailOnly) {
        const email = user.email?.toLowerCase() ?? "";
        if (!email.endsWith("@gmail.com")) return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
