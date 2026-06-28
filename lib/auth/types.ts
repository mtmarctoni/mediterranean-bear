/**
 * Auth.js type augmentations.
 *
 * Extends the default `Session.user` shape with our internal `customerId` and
 * `role` so they are visible throughout the app (server components, route
 * handlers, proxy).
 *
 * The JWT token is augmented locally (via `AppToken`) rather than via a
 * `declare module "next-auth/jwt"` augmentation, because the `@auth/core/jwt`
 * module is a transitive dependency and not directly resolvable from this
 * project under pnpm's isolated node_modules.
 *
 * See plans/005-auth-customers.md.
 */
import "next-auth";
import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

export type CustomerRole = "customer" | "admin";

/** Augmented user object returned from the Credentials `authorize` callback. */
export interface AppUser {
  /** Internal customers table id. */
  customerId: string;
  role: CustomerRole;
  name?: string | null;
  email?: string | null;
}

/**
 * The JWT token we issue. Auth.js' `JWT` type already extends
 * `Record<string, unknown>`, so we use this local view for typed access in
 * the callbacks.
 */
export interface AppToken extends DefaultJWT {
  customerId?: string;
  role?: CustomerRole;
}

declare module "next-auth" {
  interface Session {
    user: {
      customerId: string;
      role: CustomerRole;
    } & DefaultSession["user"];
  }

  interface User {
    customerId?: string;
    role?: CustomerRole;
  }
}
