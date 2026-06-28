import {
  getOrderById,
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/orders/queries";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/orders/[id] -- order detail (admin only).
 */
export async function GET(_request: Request, { params }: PageProps) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response!;

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  return Response.json(order);
}

interface PatchBody {
  status?: unknown;
  note?: unknown;
}

/**
 * PATCH /api/admin/orders/[id] -- update order status (admin only).
 * Body: { status: OrderStatus, note?: string }
 */
export async function PATCH(request: Request, { params }: PageProps) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response!;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body || typeof body.status !== "string") {
    return Response.json({ error: "status is required" }, { status: 400 });
  }

  const order = await getOrderById(id);
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await updateOrderStatus({
    orderId: id,
    toStatus: body.status as OrderStatus,
    note: typeof body.note === "string" ? body.note : null,
    createdBy: "admin",
  });

  return Response.json(updated);
}
