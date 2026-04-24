import NextAuth from "next-auth";
import type { NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const nextAuth: NextAuthResult = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({}),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const rawEmail = credentials.email as string;
        const email = rawEmail.toLowerCase().trim();
        const password = credentials.password as string;

        console.log("[auth] authorize called — raw email:", rawEmail, "| normalized:", email);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        console.log("[auth] DB lookup result — found user:", !!user, "| has passwordHash:", !!user?.passwordHash);

        if (!user?.passwordHash) {
          console.log("[auth] authorize failed — no user or no passwordHash");
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        console.log("[auth] bcrypt.compare result:", valid);

        if (!valid) {
          console.log("[auth] authorize failed — wrong password");
          return null;
        }

        console.log("[auth] authorize succeeded for user id:", user.id);
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
});

export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const auth: NextAuthResult["auth"] = nextAuth.auth;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;
