/**
 * Cart cookie helpers.
 *
 * The anonymous cart is identified by a `cart_token` cookie (UUID) that points
 * to a `cart_sessions` row. The cookie is httpOnly + sameSite=lax, valid for
 * 30 days (see plans/006-cart-state.md).
 */

import { cookies } from "next/headers";

export const CART_COOKIE_NAME = "cart_token";
/** 30 days in seconds. */
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Generate a fresh cart token (UUID v4 via Web Crypto).
 * Works in server runtimes that expose `crypto.randomUUID`.
 */
export function generateCartToken(): string {
  return crypto.randomUUID();
}

/** Read the current cart token from the request cookies, or null. */
export async function getCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE_NAME)?.value ?? null;
}

/**
 * Set the cart token cookie on the outgoing response. Call this from a Route
 * Handler (or Server Action) -- not from a Server Component.
 */
export async function setCartToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}
