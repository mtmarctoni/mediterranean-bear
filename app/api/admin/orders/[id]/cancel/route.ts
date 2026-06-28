import { getOrderById, updateOrderStatus } from "@/lib/orders/queries";
import { requireAdmin } from "@/lib/admin/auth";
import { sendOrderCancelled } from "@/lib/email";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/orders/[id]/cancel -- cancel an order (admin). Only allowed
 * for orders that haven't shipped yet.
 */
export async function POST(_request: Request, { params }: PageProps) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response!;

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status === "shipped" || order.status === "delivered") {
    return Response.json(
      { error: "Cannot cancel an order that has already shipped" },
      { status: 400 },
    );
  }
  if (order.status === "cancelled") {
    return Response.json({ ok: true, status: "cancelled" });
  }

  await updateOrderStatus({
    orderId: id,
    toStatus: "cancelled",
    note: "Cancelled by admin",
    createdBy: "admin",
  });

  // The cancel action is only a status change -- it does NOT refund. If the
  // admin wants to refund, they use the separate refund route. Tell the
  // customer the order was cancelled without claiming a refund was issued.
  try {
    await sendOrderCancelled(order, false);
  } catch (err) {
    console.error("[admin/cancel] email failed:", err);
  }

  return Response.json({ ok: true, status: "cancelled" });
}
