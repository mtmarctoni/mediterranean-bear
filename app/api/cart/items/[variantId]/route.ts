import { and, eq } from "drizzle-orm";

import { getCartBySessionId, getOrCreateCartSession } from "@/lib/cart/server";
import { db } from "@/lib/db";
import { cart_items } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/cart/items/[variantId] -- remove a line item from the cart.
 */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/cart/items/[variantId]">,
) {
  const { variantId } = await ctx.params;
  const { id: sessionId } = await getOrCreateCartSession();

  await db
    .delete(cart_items)
    .where(
      and(
        eq(cart_items.cart_session_id, sessionId),
        eq(cart_items.product_variant_id, variantId),
      ),
    );

  const cart = await getCartBySessionId(sessionId);
  return Response.json(cart);
}
