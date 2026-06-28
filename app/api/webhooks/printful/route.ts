import crypto from "node:crypto";

import {
  getOrderById,
  getOrderByPrintfulOrderId,
  patchOrder,
  updateOrderStatus,
} from "@/lib/orders/queries";
import { sendAdminFailureAlert, sendShippingConfirmation } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Printful webhook event payload (subset of fields we act on).
 * See plans/012-webhooks.md.
 */
interface PrintfulWebhookEvent {
  /** Event type, e.g. "package.shipped". */
  type?: string;
  /** Event UUID for idempotency. */
  id?: string;
  data?: {
    order?: {
      id?: number;
      external_id?: string;
      status?: string;
    };
    shipment?: {
      id?: number;
      service?: string;
      tracking_number?: string;
      tracking_url?: string;
    };
    package?: {
      id?: number;
      service?: string;
      tracking_number?: string;
      tracking_url?: string;
    };
  };
}

/**
 * Verify a Printful webhook signature using HMAC-SHA256 and a
 * timing-safe comparison (prevents timing attacks). See plans/012.
 */
function verifyPrintfulSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PRINTFUL_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * POST /api/webhooks/printful
 *
 * Public endpoint verified by the `X-PF-Signature` header. Handles order and
 * package lifecycle events. Every handler is idempotent: it checks the current
 * order status before transitioning. See plans/004, 012.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("X-PF-Signature") ?? "";
  if (!signature) {
    return new Response("Missing X-PF-Signature header", { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifyPrintfulSignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: PrintfulWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PrintfulWebhookEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = event.type ?? "";
  const eventId = event.id ?? "";
  const orderRef = event.data?.order;
  const orderId = orderRef?.external_id ?? null;
  const printfulOrderId = orderRef?.id ?? null;

  try {
    switch (eventType) {
      case "order.created":
        await handleOrderCreated(orderId, printfulOrderId, eventId);
        break;
      case "order.in_progress":
        await transitionOrder(orderId, printfulOrderId, "in_progress", eventId);
        break;
      case "order.on_hold":
        await handleOnHold(orderId, printfulOrderId, eventId);
        break;
      case "order.canceled":
        await handleCancelled(orderId, printfulOrderId, eventId);
        break;
      case "order.fulfilled":
        await transitionOrder(orderId, printfulOrderId, "shipped", eventId);
        break;
      case "package.shipped":
        await handlePackageShipped(orderId, printfulOrderId, event, eventId);
        break;
      case "package.returned":
        await handlePackageReturned(orderId, printfulOrderId, eventId);
        break;
      default:
        // Unhandled event -- acknowledge so Printful doesn't retry.
        break;
    }
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[webhook/printful] handler error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }
}

/** Resolve an order by our id (external_id) or Printful order id. */
async function resolveOrder(
  orderId: string | null,
  printfulOrderId: number | null,
) {
  if (orderId) {
    const byId = await getOrderById(orderId);
    if (byId) return byId;
  }
  if (printfulOrderId) {
    return getOrderByPrintfulOrderId(printfulOrderId);
  }
  return null;
}

/**
 * order.created -- idempotency confirmation. If our order is already
 * `submitted`, no-op. If still `confirmed` (our POST response was lost),
 * update to `submitted` using the Printful order id from the payload.
 */
async function handleOrderCreated(
  orderId: string | null,
  printfulOrderId: number | null,
  eventId: string,
): Promise<void> {
  const order = await resolveOrder(orderId, printfulOrderId);
  if (!order) return;
  if (order.status === "submitted" || order.status === "in_progress") return;
  if (printfulOrderId) {
    await patchOrder(order.id, { printfulOrderId, status: "submitted" });
  }
  await updateOrderStatus({
    orderId: order.id,
    toStatus: "submitted",
    note: printfulOrderId ? `Printful order ${printfulOrderId} created` : "Printful order.created",
    createdBy: "printful",
    webhookEventId: eventId || null,
  });
}

/** Generic status transition with idempotency. */
async function transitionOrder(
  orderId: string | null,
  printfulOrderId: number | null,
  toStatus: "in_progress" | "shipped",
  eventId: string,
): Promise<void> {
  const order = await resolveOrder(orderId, printfulOrderId);
  if (!order) return;
  if (order.status === toStatus) return; // idempotent
  await updateOrderStatus({
    orderId: order.id,
    toStatus,
    createdBy: "printful",
    webhookEventId: eventId || null,
  });
}

/** order.on_hold -- update status + alert admin. */
async function handleOnHold(
  orderId: string | null,
  printfulOrderId: number | null,
  eventId: string,
): Promise<void> {
  const order = await resolveOrder(orderId, printfulOrderId);
  if (!order) return;
  if (order.status === "on_hold") return;
  await updateOrderStatus({
    orderId: order.id,
    toStatus: "on_hold",
    note: "Printful flagged the order on hold",
    createdBy: "printful",
    webhookEventId: eventId || null,
  });
  // Best-effort admin alert.
  try {
    await sendAdminFailureAlert(order, "Printful placed the order on hold. Review in the Printful dashboard.");
  } catch (err) {
    console.error("[webhook/printful] admin alert failed:", err);
  }
}

/** order.canceled -- update status + alert admin to handle refund. */
async function handleCancelled(
  orderId: string | null,
  printfulOrderId: number | null,
  eventId: string,
): Promise<void> {
  const order = await resolveOrder(orderId, printfulOrderId);
  if (!order) return;
  if (order.status === "cancelled") return;
  await updateOrderStatus({
    orderId: order.id,
    toStatus: "cancelled",
    note: "Printful cancelled the order",
    createdBy: "printful",
    webhookEventId: eventId || null,
  });
  try {
    await sendAdminFailureAlert(
      order,
      "Printful cancelled the order. Review whether a customer refund is required.",
    );
  } catch (err) {
    console.error("[webhook/printful] admin alert failed:", err);
  }
}

/** package.shipped -- store tracking + carrier, email the customer. */
async function handlePackageShipped(
  orderId: string | null,
  printfulOrderId: number | null,
  event: PrintfulWebhookEvent,
  eventId: string,
): Promise<void> {
  const order = await resolveOrder(orderId, printfulOrderId);
  if (!order) return;

  const pkg = event.data?.package ?? event.data?.shipment;
  const trackingNumber = pkg?.tracking_number ?? null;
  const carrier = pkg?.service ?? "carrier";

  if (trackingNumber) {
    await patchOrder(order.id, {
      shippingTracking: trackingNumber,
      shippingCarrier: carrier,
    });
  }
  if (order.status !== "shipped") {
    await updateOrderStatus({
      orderId: order.id,
      toStatus: "shipped",
      note: trackingNumber ? `Shipped via ${carrier} (${trackingNumber})` : "Package shipped",
      createdBy: "printful",
      webhookEventId: eventId || null,
    });

    // Only email on the first transition to "shipped" -- duplicate webhook
    // events must not re-trigger the shipping confirmation.
    if (trackingNumber) {
      try {
        await sendShippingConfirmation(order, {
          number: trackingNumber,
          carrier,
        });
      } catch (err) {
        console.error("[webhook/printful] shipping email failed:", err);
      }
    }
  }
}

/** package.returned -- alert admin. */
async function handlePackageReturned(
  orderId: string | null,
  printfulOrderId: number | null,
  eventId: string,
): Promise<void> {
  const order = await resolveOrder(orderId, printfulOrderId);
  if (!order) return;
  await updateOrderStatus({
    orderId: order.id,
    toStatus: order.status as "shipped" | "delivered",
    note: "Package returned to Printful - admin review required",
    createdBy: "printful",
    webhookEventId: eventId || null,
  });
  try {
    await sendAdminFailureAlert(
      order,
      "A package was returned to Printful. Contact the customer to resolve.",
    );
  } catch (err) {
    console.error("[webhook/printful] admin alert failed:", err);
  }
}
