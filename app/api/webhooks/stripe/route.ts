import { getStripe } from "@/lib/stripe";
import {
  getOrderByPaymentIntentId,
  getOrderByStripeSessionId,
  patchOrder,
  updateOrderStatus,
} from "@/lib/orders/queries";
import { submitOrderToPrintful } from "@/lib/orders/submit";
import { sendOrderCancelled, sendOrderConfirmation } from "@/lib/email";
import type { OrderDTO } from "@/lib/orders/queries";

/** Webhooks must not be cached and must read the raw body. */
export const dynamic = "force-dynamic";
/**
 * Disable Next.js' default body parsing for this route so we can access the
 * raw request body for Stripe signature verification. In the App Router we
 * read `request.text()` directly, which gives us the raw bytes as a string.
 */
// (no body parser config needed in App Router -- we read text() below)

type StripeEvent =
  | {
      id: string;
      type: "checkout.session.completed";
      data: {
        object: {
          id: string;
          payment_intent: string | null;
          amount_total: number | null;
          total_details: { amount_tax: number | null } | null;
          metadata: Record<string, string> | null;
        };
      };
    }
  | {
      id: string;
      type: "checkout.session.expired";
      data: { object: { id: string; metadata: Record<string, string> | null } };
    }
  | {
      id: string;
      type: "charge.refunded";
      data: { object: { payment_intent: string | null } };
    }
  | {
      id: string;
      type: "charge.dispute.created";
      data: { object: { payment_intent: string | null } };
    };

/**
 * POST /api/webhooks/stripe
 *
 * Public endpoint verified by the Stripe signature header. Uses the RAW
 * request body for signature verification (not parsed JSON). Handles:
 *  - checkout.session.completed  -> confirm, submit to Printful, email customer
 *  - checkout.session.expired     -> cancel order
 *  - charge.refunded              -> mark refunded, email customer
 *  - charge.dispute.created       -> flag for admin review
 *
 * Every handler is idempotent: it checks the current order status before
 * applying a transition. The Stripe event id is stored on each history row
 * for idempotency (unique index on order_id + webhook_event_id). See
 * plans/003, 012.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Read the RAW body as text -- Stripe signs the exact bytes it sent.
  const rawBody = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook/stripe] STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: StripeEvent;
  try {
    const stripe = getStripe();
    // constructEventAsync accepts the raw string payload.
    const verified = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      secret,
    );
    event = verified as unknown as StripeEvent;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[webhook/stripe] signature verification failed:", message);
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, event.id);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object, event.id);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object, event.id);
        break;
      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object, event.id);
        break;
      default:
        // Unhandled event -- acknowledge so Stripe doesn't retry.
        break;
    }
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[webhook/stripe] handler error:", err);
    // Non-2xx -> Stripe retries with exponential backoff.
    return new Response("Webhook handler error", { status: 500 });
  }
}

/** checkout.session.completed -- payment confirmed. */
async function handleCheckoutCompleted(
  session: {
    id: string;
    payment_intent: string | null;
    amount_total: number | null;
    total_details: { amount_tax: number | null } | null;
    metadata: Record<string, string> | null;
  },
  webhookEventId: string,
): Promise<void> {
  const order = await getOrderByStripeSessionId(session.id);
  if (!order) {
    console.error("[webhook/stripe] no order for session", session.id);
    return;
  }

  // Idempotency: if already past pending_payment, this is a duplicate event.
  // This guard applies on both paths (metadata.orderId present or missing) so
  // the fallback session-id lookup cannot double-confirm an order.
  if (order.status !== "pending_payment") {
    return;
  }

  await confirmOrder(
    order,
    session.payment_intent,
    session.amount_total,
    session.total_details?.amount_tax ?? null,
    webhookEventId,
  );
}

/**
 * Mark an order confirmed, submit to Printful, and email the customer.
 *
 * Tax and total are captured from the Stripe session here: `amount_total` is
 * the grand total Stripe charged (subtotal + shipping + tax, in cents) and
 * `total_details.amount_tax` is the tax portion. When `amount_total` is null
 * (e.g. an inline session without automatic tax), we recompute the total from
 * subtotal + shipping + tax. See plans/013.
 */
async function confirmOrder(
  order: OrderDTO,
  paymentIntentId: string | null,
  amountTotalCents: number | null,
  taxCents: number | null,
  webhookEventId: string,
): Promise<void> {
  const resolvedTaxCents = taxCents ?? 0;
  const resolvedTotalCents =
    amountTotalCents ??
    order.subtotalCents + order.shippingCents + resolvedTaxCents;

  await patchOrder(order.id, {
    stripePaymentIntentId: paymentIntentId ?? null,
    status: "confirmed",
    taxCents: resolvedTaxCents,
    totalCents: resolvedTotalCents,
  });
  await updateOrderStatus({
    orderId: order.id,
    toStatus: "confirmed",
    note: "Stripe payment confirmed",
    createdBy: "system",
    webhookEventId,
  });

  // Submit to Printful asynchronously (fire-and-forget) to avoid webhook
  // timeouts. submitOrderToPrintful catches all its own errors.
  void submitOrderToPrintful(order.id);

  // Send the confirmation email fire-and-forget so a slow Resend call does
  // not delay the webhook response. Errors are logged, not thrown.
  const refreshed = await getOrderByStripeSessionId(order.stripeSessionId);
  if (refreshed) {
    void sendOrderConfirmation(refreshed).catch((err) =>
      console.error("[webhook/stripe] confirmation email failed:", err),
    );
  }
}

/** checkout.session.expired -- customer abandoned, cancel the order. */
async function handleCheckoutExpired(
  session: {
    id: string;
    metadata: Record<string, string> | null;
  },
  webhookEventId: string,
): Promise<void> {
  const order = await getOrderByStripeSessionId(session.id);
  if (!order) return;
  if (order.status !== "pending_payment") return; // idempotent
  await patchOrder(order.id, { status: "cancelled" });
  await updateOrderStatus({
    orderId: order.id,
    toStatus: "cancelled",
    note: "Stripe Checkout session expired",
    createdBy: "system",
    webhookEventId,
  });
}

/** charge.refunded -- mark order refunded and email the customer. */
async function handleChargeRefunded(
  charge: {
    payment_intent: string | null;
  },
  webhookEventId: string,
): Promise<void> {
  if (!charge.payment_intent) return;
  const order = await getOrderByPaymentIntentId(charge.payment_intent);
  if (!order) return;
  if (order.status === "refunded") return; // idempotent
  await patchOrder(order.id, { status: "refunded" });
  await updateOrderStatus({
    orderId: order.id,
    toStatus: "refunded",
    note: "Stripe refund processed",
    createdBy: "system",
    webhookEventId,
  });
  await sendOrderCancelled(order, true);
}

/** charge.dispute.created -- flag for admin review. */
async function handleDisputeCreated(
  charge: {
    payment_intent: string | null;
  },
  webhookEventId: string,
): Promise<void> {
  if (!charge.payment_intent) return;
  const order = await getOrderByPaymentIntentId(charge.payment_intent);
  if (!order) return;
  // Record an admin-facing note via history; do not change fulfillment status.
  await updateOrderStatus({
    orderId: order.id,
    toStatus: order.status as OrderDTO["status"],
    note: "Charge dispute opened - admin review required",
    createdBy: "system",
    webhookEventId,
  });
}
