/**
 * Auth.js v5 (NextAuth) configuration.
 *
 * Email/password credentials provider backed by our `customers` table. The
 * internal `customerId` and `role` are attached to the JWT token and session
 * so server components / route handlers / middleware can authorize requests.
 *
 * See plans/005-auth-customers.md.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { NextResponse } from "next/server";

import { authenticateCustomer } from "@/lib/auth/sync";
import type { AppToken } from "@/lib/auth/types";

import "@/lib/auth/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        const customer = await authenticateCustomer(email, password);
        if (!customer) return null;

        return {
          id: customer.id,
          customerId: customer.id,
          role: customer.role,
          name: customer.name ?? undefined,
          email,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on first sign-in; persist its fields to the
      // token so they survive subsequent JWT reads.
      if (user) {
        const t = token as AppToken;
        t.customerId = user.customerId;
        t.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const t = token as AppToken;
        session.user.customerId = t.customerId ?? "";
        session.user.role = t.role ?? "customer";
      }
      return session;
    },
    /**
     * Route-level authorization for protected paths (run from proxy.ts).
     * - /admin/* requires an authenticated admin.
     * - /account/* requires any authenticated customer.
     * - All other paths are allowed.
     */
    authorized({ request, auth }) {
      const path = request.nextUrl.pathname;
      const loggedIn = Boolean(auth?.user);

      if (path.startsWith("/admin")) {
        if (!loggedIn) {
          return NextResponse.redirect(new URL("/sign-in", request.url));
        }
        if (auth?.user?.role !== "admin") {
          return NextResponse.redirect(new URL("/sign-in", request.url));
        }
        return true;
      }

      if (path.startsWith("/account")) {
        if (!loggedIn) {
          return NextResponse.redirect(new URL("/sign-in", request.url));
        }
        return true;
      }

      return true;
    },
  },
});
