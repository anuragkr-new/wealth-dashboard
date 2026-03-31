import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

const gmailOnly = process.env.AUTH_GMAIL_ONLY === "true";
// #region agent log
fetch('http://127.0.0.1:7439/ingest/1dc070df-a61f-458e-8ec9-144680a2ac1b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'553583'},body:JSON.stringify({sessionId:'553583',runId:'initial',hypothesisId:'H5',location:'auth.config.ts:module',message:'Auth env presence',data:{hasAuthSecret:!!process.env.AUTH_SECRET,hasGoogleId:!!process.env.AUTH_GOOGLE_ID,hasGoogleSecret:!!process.env.AUTH_GOOGLE_SECRET,gmailOnly},timestamp:Date.now()})}).catch(()=>{});
// #endregion

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
