import { getOrderById, updateOrderStatus } from "@/lib/orders/queries";
import { refundPaymentIntent } from "@/lib/stripe";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/orders/[id]/refund -- refund the order via Stripe (admin).
 * The actual `refunded` status transition happens in the Stripe
 * `charge.refunded` webhook, but we optimistically mark it here too so the UI
 * reflects the intent immediately.
 */
export async function POST(_request: Request, { params }: PageProps) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response!;

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  if (!order.stripePaymentIntentId) {
    return Response.json(
      { error: "Order has no payment intent to refund" },
      { status: 400 },
    );
  }
  if (order.status === "refunded") {
    return Response.json({ ok: true, status: "refunded" });
  }

  try {
    await refundPaymentIntent(order.stripePaymentIntentId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refund failed";
    return Response.json({ error: message }, { status: 500 });
  }

  // Optimistically mark refunded (the webhook will confirm idempotently).
  await updateOrderStatus({
    orderId: id,
    toStatus: "refunded",
    note: "Refund issued by admin",
    createdBy: "admin",
  });

  return Response.json({ ok: true, status: "refunded" });
}
