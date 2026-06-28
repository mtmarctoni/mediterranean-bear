import { and, eq } from "drizzle-orm";

import { MAX_LINE_QUANTITY, MIN_LINE_QUANTITY } from "@/lib/cart/store";
import { getCartBySessionId, getOrCreateCartSession } from "@/lib/cart/server";
import { db } from "@/lib/db";
import { cart_items, product_variants, products } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

interface PostBody {
  productVariantId?: unknown;
  quantity?: unknown;
}

interface PatchBody {
  productVariantId?: unknown;
  quantity?: unknown;
}

function clampQuantity(n: number): number {
  return Math.max(MIN_LINE_QUANTITY, Math.min(MAX_LINE_QUANTITY, Math.trunc(n)));
}

/**
 * Validate that a variant exists, is active, and its product is active.
 * Returns the product_id if valid, otherwise null.
 */
async function validateVariant(variantId: string): Promise<string | null> {
  const rows = await db
    .select({
      variantId: product_variants.id,
      productId: product_variants.product_id,
      variantStatus: product_variants.status,
      productStatus: products.status,
    })
    .from(product_variants)
    .innerJoin(products, eq(products.id, product_variants.product_id))
    .where(eq(product_variants.id, variantId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.variantStatus !== "active" || row.productStatus !== "active") {
    return null;
  }
  return row.productId;
}

/**
 * POST /api/cart/items -- add an item to the cart (upsert: sum quantities,
 * capped at MAX_LINE_QUANTITY).
 *
 * Body: { productVariantId: string, quantity?: number }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PostBody | null;
  if (!body || typeof body.productVariantId !== "string") {
    return Response.json(
      { error: "productVariantId is required" },
      { status: 400 },
    );
  }
  const requestedQty =
    typeof body.quantity === "number" ? body.quantity : 1;
  if (!Number.isFinite(requestedQty) || requestedQty < 1) {
    return Response.json({ error: "Invalid quantity" }, { status: 400 });
  }
  const quantity = clampQuantity(requestedQty);

  const productId = await validateVariant(body.productVariantId);
  if (!productId) {
    return Response.json(
      { error: "Variant not found or unavailable" },
      { status: 404 },
    );
  }

  const { id: sessionId } = await getOrCreateCartSession();

  // Upsert: if the variant is already in the cart, sum and clamp.
  const existing = await db
    .select({ id: cart_items.id, quantity: cart_items.quantity })
    .from(cart_items)
    .where(
      and(
        eq(cart_items.cart_session_id, sessionId),
        eq(cart_items.product_variant_id, body.productVariantId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const next = clampQuantity(existing[0]!.quantity + quantity);
    await db
      .update(cart_items)
      .set({ quantity: next, updated_at: new Date() })
      .where(eq(cart_items.id, existing[0]!.id));
  } else {
    await db.insert(cart_items).values({
      cart_session_id: sessionId,
      product_id: productId,
      product_variant_id: body.productVariantId,
      quantity,
    });
  }

  const cart = await getCartBySessionId(sessionId);
  return Response.json(cart);
}

/**
 * PATCH /api/cart/items -- set the absolute quantity of a cart line (1..10).
 * Upserts: if the variant is not yet in the cart, it is added with the given
 * quantity (after validating the variant/product are active). This lets the
 * client sync its full cart state without double-counting (POST sums, PATCH
 * sets absolute).
 *
 * Body: { productVariantId: string, quantity: number }
 */
export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (
    !body ||
    typeof body.productVariantId !== "string" ||
    typeof body.quantity !== "number" ||
    !Number.isFinite(body.quantity)
  ) {
    return Response.json(
      { error: "productVariantId and quantity are required" },
      { status: 400 },
    );
  }
  const quantity = clampQuantity(body.quantity);

  const productId = await validateVariant(body.productVariantId);
  if (!productId) {
    return Response.json(
      { error: "Variant not found or unavailable" },
      { status: 404 },
    );
  }

  const { id: sessionId } = await getOrCreateCartSession();

  const existing = await db
    .select({ id: cart_items.id })
    .from(cart_items)
    .where(
      and(
        eq(cart_items.cart_session_id, sessionId),
        eq(cart_items.product_variant_id, body.productVariantId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(cart_items).values({
      cart_session_id: sessionId,
      product_id: productId,
      product_variant_id: body.productVariantId,
      quantity,
    });
  } else {
    await db
      .update(cart_items)
      .set({ quantity, updated_at: new Date() })
      .where(eq(cart_items.id, existing[0]!.id));
  }

  const cart = await getCartBySessionId(sessionId);
  return Response.json(cart);
}
