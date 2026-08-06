import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord,
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(credentials) {
        const username = String(credentials.username ?? "");
        const password = String(credentials.password ?? "");
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user?.passwordHash) return null;
        const valid = await verifyPassword(password, user.passwordHash);
        return valid ? user : null;
      },
    }),
  ],
  // Self-hosted behind our own reverse proxy: Auth.js has to trust the Host
  // header to resolve the callback URL. Without this, a production build
  // refuses to read the session and every page bounces to /login.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  // JWT sessions, not database: the Credentials provider never persists a
  // Session row (it always issues a JWT cookie, regardless of `strategy`),
  // so database sessions would leave Credentials logins unable to find their
  // own cookie. Discord logins go through the same JWT path now too.
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.isPlatformAdmin = (
          user as typeof user & { isPlatformAdmin: boolean }
        ).isPlatformAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.isPlatformAdmin = token.isPlatformAdmin as boolean;
      // name/image aren't in the token — they're only set at sign-in — so
      // re-read them from the DB on every request. That's how a profile
      // edit shows up without forcing a re-login.
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { name: true, image: true },
      });
      if (dbUser) {
        session.user.name = dbUser.name;
        session.user.image = dbUser.image;
      }
      return session;
    },
  },
});
