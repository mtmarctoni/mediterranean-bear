export const dynamic = "force-dynamic";

/**
 * POST /api/cart/merge
 *
 * Merge an anonymous cart into the authenticated customer's cart on login.
 *
 * TODO(Phase 3): Implement once Auth.js lands. The flow (per plans/006):
 *   1. Fetch anonymous cart by cart_token cookie.
 *   2. Fetch authenticated cart by customer_id.
 *   3. For each anonymous item, upsert into authenticated cart (sum quantities).
 *   4. Delete the anonymous cart session.
 *   5. Issue a fresh cart_token pointing at the authenticated session.
 *
 * For now, return 200 OK so client-side calls don't fail.
 */
export async function POST() {
  return Response.json({ ok: true, merged: false, note: "Not implemented until Phase 3" });
}
