/**
 * Server-side cart helpers shared by the cart API routes.
 *
 * A "cart DTO" is the shape returned to the client. It is assembled from
 * `cart_sessions` + `cart_items` joined with `products` and `product_variants`.
 */

import { db } from "@/lib/db";
import {
  cart_items,
  cart_sessions,
  product_variants,
  products,
} from "@/lib/db/schema";
import { and, eq, gte } from "drizzle-orm";

import {
  CART_COOKIE_MAX_AGE,
  generateCartToken,
  getCartToken,
  setCartToken,
} from "./cookie";

/** 30 days from now -- cart session expiry. */
function expiryDate(): Date {
  return new Date(Date.now() + CART_COOKIE_MAX_AGE * 1000);
}

export interface CartItemDTO {
  id: string;
  productId: string;
  productVariantId: string;
  productName: string;
  productSlug: string;
  variantSize: string;
  variantColor: string;
  variantColorHex: string;
  quantity: number;
  unitPriceCents: number;
  image: string;
}

export interface CartDTO {
  cartSessionId: string;
  items: CartItemDTO[];
  subtotalCents: number;
  itemCount: number;
}

/**
 * Get (or create) the cart session for the current request. Sets the cart
 * cookie if a new session was created. Returns the cart_session id.
 */
export async function getOrCreateCartSession(): Promise<{
  id: string;
  created: boolean;
}> {
  const token = await getCartToken();

  if (token) {
    const existing = await db
      .select({ id: cart_sessions.id })
      .from(cart_sessions)
      .where(
        and(
          eq(cart_sessions.session_token, token),
          gte(cart_sessions.expires_at, new Date()),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      return { id: existing[0]!.id, created: false };
    }
  }

  // Create a new session + cookie.
  const newToken = generateCartToken();
  const [session] = await db
    .insert(cart_sessions)
    .values({
      session_token: newToken,
      expires_at: expiryDate(),
    })
    .returning({ id: cart_sessions.id });

  await setCartToken(newToken);
  return { id: session!.id, created: true };
}

/** Fetch the current cart, joined with product + variant details. */
export async function getCartForCurrentSession(): Promise<CartDTO> {
  const { id: sessionId } = await getOrCreateCartSession();
  return getCartBySessionId(sessionId);
}

/** Build a cart DTO from a session id. */
export async function getCartBySessionId(sessionId: string): Promise<CartDTO> {
  const rows = await db
    .select({
      id: cart_items.id,
      quantity: cart_items.quantity,
      productId: products.id,
      productVariantId: product_variants.id,
      productName: products.name,
      productSlug: products.slug,
      variantSize: product_variants.size,
      variantColor: product_variants.color,
      variantColorHex: product_variants.color_hex,
      priceOverrideCents: product_variants.price_override_cents,
      basePriceCents: products.base_price_cents,
      images: products.images,
      productStatus: products.status,
      variantStatus: product_variants.status,
    })
    .from(cart_items)
    .innerJoin(
      product_variants,
      eq(product_variants.id, cart_items.product_variant_id),
    )
    .innerJoin(products, eq(products.id, cart_items.product_id))
    .where(eq(cart_items.cart_session_id, sessionId));

  const items: CartItemDTO[] = rows
    .filter((r) => r.productStatus === "active" && r.variantStatus === "active")
    .map((r) => ({
      id: r.id,
      productId: r.productId,
      productVariantId: r.productVariantId,
      productName: r.productName,
      productSlug: r.productSlug,
      variantSize: r.variantSize,
      variantColor: r.variantColor,
      variantColorHex: r.variantColorHex,
      quantity: r.quantity,
      unitPriceCents: r.priceOverrideCents ?? r.basePriceCents,
      image: (r.images ?? [])[0] ?? "",
    }));

  const subtotalCents = items.reduce(
    (sum, i) => sum + i.quantity * i.unitPriceCents,
    0,
  );
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    cartSessionId: sessionId,
    items,
    subtotalCents,
    itemCount,
  };
}
