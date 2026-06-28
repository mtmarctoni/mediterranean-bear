import { getAllOrders, type OrderStatus } from "@/lib/orders/queries";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  limit?: string;
  offset?: string;
}

/**
 * GET /api/admin/orders -- list all orders (admin only).
 * Query: status, limit, offset.
 */
export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response!;

  const url = new URL(request.url);
  const sp: SearchParams = Object.fromEntries(url.searchParams.entries());
  const status =
    sp.status && isValidStatus(sp.status) ? (sp.status as OrderStatus) : null;
  const limit = sp.limit ? Math.max(1, parseInt(sp.limit, 10) || 50) : 50;
  const offset = sp.offset ? Math.max(0, parseInt(sp.offset, 10) || 0) : 0;

  const result = await getAllOrders({ status, limit, offset });
  return Response.json(result);
}

function isValidStatus(s: string): boolean {
  return [
    "pending_payment",
    "confirmed",
    "submitted",
    "in_progress",
    "on_hold",
    "cancelled",
    "shipped",
    "delivered",
    "refunded",
    "failed",
  ].includes(s);
}
