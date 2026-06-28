import { getCartForCurrentSession } from "@/lib/cart/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/cart -- return the current visitor's cart, creating a session if
 * none exists (sets the cart_token cookie).
 */
export async function GET() {
  const cart = await getCartForCurrentSession();
  return Response.json(cart);
}
