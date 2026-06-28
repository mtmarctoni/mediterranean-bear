/**
 * Stripe client + Checkout Session helpers.
 *
 * The Stripe SDK is initialised with the secret key from env (server-side
 * only -- never expose to the client). We use Stripe Checkout Sessions
 * (hosted payment page) with automatic tax enabled. The shipping address is
 * collected on our /checkout page and passed via metadata; we do NOT enable
 * `shipping_address_collection` so the customer cannot change it on Stripe's
 * page (see plans/003, 013).
 *
 * Currency is EUR throughout. MVP ships to Spain only.
 */
import Stripe from "stripe";

import type { CartItemDTO } from "@/lib/cart/server";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string | null;
  city: string;
  stateCode: string;
  zip: string;
  countryCode: string;
  phone?: string | null;
}

export interface CreateCheckoutSessionInput {
  items: CartItemDTO[];
  shippingAddress: ShippingAddress;
  /** Shipping cost in cents (from the Printful quote, charged as a flat amount). */
  shippingRateCents: number;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
}

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Lazy Stripe client. Created on first use so importing this module at build
 * time does not throw when STRIPE_SECRET_KEY is unset. An actual call surfaces
 * a clear error.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Configure it to use the Stripe API.",
    );
  }
  // We omit `apiVersion` so the SDK uses its bundled latest version, avoiding
  // type mismatches between the installed SDK and a hardcoded version string.
  cached = new Stripe(secretKey);
  return cached;
}

/* -------------------------------------------------------------------------- */
/* Checkout Session                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Create a Stripe Checkout Session for an order.
 *
 * - Line items built from cart items (price_data inline, no pre-created Prices).
 * - Shipping charged as a flat `shipping_options` amount.
 * - automatic_tax enabled -- Stripe calculates tax from the address metadata.
 * - Address collected on our site (metadata), NOT via shipping_address_collection.
 * - success_url -> /order/{orderId}/confirmation
 * - cancel_url  -> /cart
 *
 * Returns the hosted Checkout URL to redirect the customer to.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    input.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "eur",
        unit_amount: item.unitPriceCents,
        product_data: {
          name: item.productName,
          description: [
            item.variantColor,
            item.variantSize ? `Size ${item.variantSize}` : null,
          ]
            .filter(Boolean)
            .join(" - "),
          images: item.image ? [item.image] : [],
        },
      },
    }));

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: lineItems,
    // Flat shipping amount (in cents) from the Printful quote.
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: input.shippingRateCents,
            currency: "eur",
          },
          display_name: "Shipping",
          delivery_estimate: {
            maximum: {
              unit: "business_day",
              value: 7,
            },
            minimum: {
              unit: "business_day",
              value: 2,
            },
          },
        },
      },
    ],
    automatic_tax: { enabled: true },
    customer_email: input.customerEmail,
    metadata: {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      shippingAddress: JSON.stringify(input.shippingAddress),
    },
    success_url: `${siteUrl}/order/${input.orderId}/confirmation`,
    cancel_url: `${siteUrl}/cart`,
  };

  const session = await stripe.checkout.sessions.create(params);
  if (!session.url) {
    throw new Error("Stripe Checkout Session did not return a URL.");
  }
  return { url: session.url, sessionId: session.id };
}

/* -------------------------------------------------------------------------- */
/* Refund helper                                                              */
/* -------------------------------------------------------------------------- */

/** Refund a PaymentIntent in full (admin action). Returns the Stripe Refund. */
export async function refundPaymentIntent(
  paymentIntentId: string,
): Promise<Stripe.Refund> {
  const stripe = getStripe();
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}
