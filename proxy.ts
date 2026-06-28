/**
 * Next.js 16 Proxy (formerly "middleware").
 *
 * In Next.js 16 the `middleware.ts` file convention was renamed to `proxy.ts`
 * (see node_modules/next/dist/docs/.../proxy.md). Per the project's AGENTS.md
 * we heed deprecation notices, so this file uses the new convention.
 *
 * Auth.js's `auth` function is used as the proxy handler. The actual route
 * authorization logic lives in the `authorized` callback in lib/auth.ts so it
 * can be unit-tested independently. This file just wires auth into the request
 * pipeline and restricts which paths it runs on.
 *
 * Protected paths:
 *  - /account/*  -> requires an authenticated customer
 *  - /admin/*    -> requires an authenticated admin
 *
 * See plans/005-auth-customers.md.
 */
import { auth } from "@/lib/auth";

export default auth;

export const config = {
  // Only run the proxy on paths that need session checks. All API routes
  // (including Auth.js' own /api/auth/* and the webhooks) handle their own
  // auth/signature verification, so they are excluded here.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
