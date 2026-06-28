import { getOrderById } from "@/lib/orders/queries";
import { submitOrderToPrintful } from "@/lib/orders/submit";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
/** Printful submission can take a few seconds. */
export const maxDuration = 30;

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/orders/[id]/retry -- retry Printful submission (admin only).
 * Allowed for orders in the `failed` or `confirmed` state.
 */
export async function POST(_request: Request, { params }: PageProps) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response!;

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "failed" && order.status !== "confirmed") {
    return Response.json(
      { error: "Can only retry failed or confirmed orders" },
      { status: 400 },
    );
  }

  // Submit and wait for the result so we can report success/failure.
  await submitOrderToPrintful(id);

  const refreshed = await getOrderById(id);
  if (refreshed?.status === "submitted") {
    return Response.json({ ok: true, status: refreshed.status });
  }
  return Response.json(
    {
      ok: false,
      status: refreshed?.status ?? "unknown",
      error: "Submission failed. See order history for details.",
    },
    { status: 500 },
  );
}
