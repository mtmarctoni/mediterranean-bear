/**
 * Email sending via Resend.
 *
 * Wraps the Resend client and exposes typed helpers for the transactional
 * emails Mediterranean Bear sends: order confirmation, shipping confirmation,
 * cancellation, and the admin Printful-failure alert.
 *
 * Templates are React Email components (emails/*.tsx). The client is created
 * lazily so importing this module at build time does not throw when
 * RESEND_API_KEY is unset; a real send surfaces a clear error. All helpers
 * are best-effort: they log on failure but never reject, so callers in
 * webhooks can fire-and-forget.
 *
 * See plans/009 (email notifications).
 */
import { Resend } from "resend";

import {
  AdminFailureAlertEmail,
} from "@/emails/admin-failure-alert";
import { OrderCancelledEmail } from "@/emails/order-cancelled";
import { OrderConfirmationEmail } from "@/emails/order-confirmation";
import { ShippingConfirmationEmail } from "@/emails/shipping-confirmation";
import type { OrderDTO } from "@/lib/orders/queries";

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

let cached: Resend | null = null;

function getResend(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Configure it to send transactional emails.",
    );
  }
  cached = new Resend(apiKey);
  return cached;
}

/** Resolved "from" address -- dev vs prod. */
function fromAddress(): string {
  if (process.env.NODE_ENV !== "production") {
    return (
      process.env.EMAIL_FROM_DEV ??
      process.env.EMAIL_FROM ??
      "Mediterranean Bear <dev@mediterraneanbear.com>"
    );
  }
  return (
    process.env.EMAIL_FROM ??
    "Mediterranean Bear <hello@mediterraneanbear.com>"
  );
}

/** Send an email; logs on failure but never rejects. */
async function send(
  to: string,
  subject: string,
  react: React.ReactElement,
): Promise<void> {
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject,
      react,
    });
    if (error) {
      console.error(`[email] send to ${to} failed:`, error);
    }
  } catch (err) {
    console.error(`[email] send to ${to} threw:`, err);
  }
}

/* -------------------------------------------------------------------------- */
/* Public helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Send the order confirmation email to the customer. */
export async function sendOrderConfirmation(order: OrderDTO): Promise<void> {
  await send(
    order.email,
    `Order ${order.orderNumber} confirmed`,
    <OrderConfirmationEmail order={order} />,
  );
}

/** Send the shipping confirmation email with tracking info. */
export async function sendShippingConfirmation(
  order: OrderDTO,
  tracking: { number: string; carrier: string },
): Promise<void> {
  await send(
    order.email,
    `Your order ${order.orderNumber} has shipped`,
    <ShippingConfirmationEmail
      order={order}
      trackingNumber={tracking.number}
      carrier={tracking.carrier}
    />,
  );
}

/** Send the order cancelled email (optionally noting a refund). */
export async function sendOrderCancelled(
  order: OrderDTO,
  refunded: boolean,
): Promise<void> {
  await send(
    order.email,
    `Order ${order.orderNumber} cancelled`,
    <OrderCancelledEmail order={order} refunded={refunded} />,
  );
}

/** Send an admin alert that Printful submission failed for a paid order. */
export async function sendAdminFailureAlert(
  order: OrderDTO,
  error: string,
): Promise<void> {
  // Best-effort: send to the site's from address (admin inbox). Configure a
  // dedicated ADMIN_EMAIL in env to override.
  const adminEmail =
    process.env.ADMIN_EMAIL ??
    process.env.EMAIL_FROM ??
    "admin@mediterraneanbear.com";
  await send(
    adminEmail,
    `ACTION NEEDED: Printful submission failed for ${order.orderNumber}`,
    <AdminFailureAlertEmail order={order} error={error} />,
  );
}
