import { auth } from "@/lib/auth";
import { getCartForCurrentSession } from "@/lib/cart/server";
import { db } from "@/lib/db";
import {
  addresses,
  customers,
  order_items,
  orders,
  product_variants,
  products,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

import { createCheckoutSession, type ShippingAddress } from "@/lib/stripe";
import { generateOrderNumber } from "@/lib/orders/number";
import { getShippingQuote } from "@/lib/shipping/quote";

export const dynamic = "force-dynamic";

interface CheckoutBody {
  shippingAddress?: {
    firstName?: unknown;
    lastName?: unknown;
    line1?: unknown;
    line2?: unknown;
    city?: unknown;
    stateCode?: unknown;
    zip?: unknown;
    countryCode?: unknown;
    phone?: unknown;
  };
  /**
   * Client-supplied shipping estimate -- IGNORED. The authoritative shipping
   * charge is re-computed server-side via Printful below so a malicious client
   * cannot request free shipping. Kept in the type for backwards-compat.
   */
  shippingRateCents?: unknown;
  email?: unknown;
}

/**
 * POST /api/stripe/checkout
 *
 * Creates an order in the DB (status: pending_payment) and a Stripe Checkout
 * Session, returning the hosted Checkout URL for the client to redirect to.
 *
 * Cart items are ALWAYS fetched server-side from the cart cookie -- the client
 * never sends an item list. Guest checkout is allowed; authenticated users'
 * orders are linked to their customer record.
 *
 * See plans/003-stripe-payments.md.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CheckoutBody | null;
  if (!body || !body.shippingAddress) {
    return Response.json(
      { error: "shippingAddress is required" },
      { status: 400 },
    );
  }

  const a = body.shippingAddress;
  if (
    typeof a.firstName !== "string" ||
    typeof a.lastName !== "string" ||
    typeof a.line1 !== "string" ||
    typeof a.city !== "string" ||
    typeof a.zip !== "string"
  ) {
    return Response.json(
      { error: "Incomplete shipping address" },
      { status: 400 },
    );
  }
  const countryCode =
    typeof a.countryCode === "string" && a.countryCode.length === 2
      ? a.countryCode
      : "ES";

  // 1. Fetch cart server-side (never trust client items).
  const cart = await getCartForCurrentSession();
  if (cart.items.length === 0) {
    return Response.json({ error: "Your cart is empty" }, { status: 400 });
  }

  // 2. Validate all items are still active.
  for (const item of cart.items) {
    const rows = await db
      .select({
        variantStatus: product_variants.status,
        productStatus: products.status,
      })
      .from(product_variants)
      .innerJoin(products, eq(products.id, product_variants.product_id))
      .where(eq(product_variants.id, item.productVariantId))
      .limit(1);
    const row = rows[0];
    if (!row || row.variantStatus !== "active" || row.productStatus !== "active") {
      return Response.json(
        { error: `Item ${item.productName} is no longer available` },
        { status: 400 },
      );
    }
  }

  // 3. Resolve Printful variant ids for the cart items so we can re-query
  //    Printful for the shipping rate server-side. We NEVER trust a
  //    client-supplied shipping amount -- otherwise a malicious client can
  //    request free shipping. See plans/013.
  const variantRows = await db
    .select({
      id: product_variants.id,
      printfulVariantId: product_variants.printful_variant_id,
    })
    .from(product_variants)
    .where(
      inArray(
        product_variants.id,
        cart.items.map((i) => i.productVariantId),
      ),
    );
  const printfulVariantIdByInternalId = new Map(
    variantRows.map((r) => [r.id, r.printfulVariantId]),
  );
  const quoteItems = cart.items
    .map((i) => {
      const variantId = printfulVariantIdByInternalId.get(i.productVariantId);
      if (!variantId) return null;
      return { variantId, quantity: i.quantity };
    })
    .filter((i): i is { variantId: number; quantity: number } => i !== null);

  const shippingQuote = await getShippingQuote(quoteItems, {
    line1: a.line1,
    line2: typeof a.line2 === "string" ? a.line2 : undefined,
    city: a.city,
    stateCode: typeof a.stateCode === "string" ? a.stateCode : undefined,
    zip: a.zip,
    countryCode,
  });
  const shippingRateCents = shippingQuote.retailRateCents;

  // 4. Resolve the customer (auth or guest) + email.
  const session = await auth();
  let customerId: string | null = null;
  let email = "";

  if (session?.user?.email) {
    email = session.user.email;
    customerId = session.user.customerId || null;
  } else {
    // Guest checkout -- email comes from the body.
    if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return Response.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }
    email = body.email.trim().toLowerCase();
    // Link to an existing customer with this email if one exists (so past
    // guest orders aggregate when they later sign up).
    const existing = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);
    if (existing.length > 0) customerId = existing[0]!.id;
  }

  // 5. Generate order number + create the shipping address row.
  const orderNumber = await generateOrderNumber();
  const [addressRow] = await db
    .insert(addresses)
    .values({
      customer_id: customerId,
      first_name: a.firstName,
      last_name: a.lastName,
      line1: a.line1,
      line2: typeof a.line2 === "string" ? a.line2 : null,
      city: a.city,
      state_code: typeof a.stateCode === "string" ? a.stateCode : "",
      zip: a.zip,
      country_code: countryCode,
      phone: typeof a.phone === "string" ? a.phone : null,
      is_default: false,
    })
    .returning({ id: addresses.id });

  // 6. Create the order (status: pending_payment). Tax is finalized by Stripe;
  //    we record 0 here and update it from the webhook.
  const subtotalCents = cart.subtotalCents;
  const totalCents = subtotalCents + shippingRateCents;

  const [orderRow] = await db
    .insert(orders)
    .values({
      order_number: orderNumber,
      customer_id: customerId,
      email,
      stripe_session_id: "pending", // set after the Stripe session is created
      status: "pending_payment",
      subtotal_cents: subtotalCents,
      shipping_cents: shippingRateCents,
      tax_cents: 0,
      total_cents: totalCents,
      currency: "eur",
      shipping_address_id: addressRow!.id,
    })
    .returning({ id: orders.id });

  const orderId = orderRow!.id;

  // 7. Create order_items snapshots.
  await db.insert(order_items).values(
    cart.items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      product_variant_id: item.productVariantId,
      product_name: item.productName,
      variant_size: item.variantSize,
      variant_color: item.variantColor,
      quantity: item.quantity,
      unit_price_cents: item.unitPriceCents,
    })),
  );

  // 8. Create the Stripe Checkout Session.
  const shippingAddress: ShippingAddress = {
    firstName: a.firstName,
    lastName: a.lastName,
    line1: a.line1,
    line2: typeof a.line2 === "string" ? a.line2 : null,
    city: a.city,
    stateCode: typeof a.stateCode === "string" ? a.stateCode : "",
    zip: a.zip,
    countryCode,
    phone: typeof a.phone === "string" ? a.phone : null,
  };

  try {
    const { url, sessionId } = await createCheckoutSession({
      items: cart.items,
      shippingAddress,
      shippingRateCents,
      orderId,
      orderNumber,
      customerEmail: email,
    });

    // Persist the real Stripe session id.
    await db
      .update(orders)
      .set({ stripe_session_id: sessionId, updated_at: new Date() })
      .where(eq(orders.id, orderId));

    return Response.json({ url });
  } catch (err) {
    console.error("[checkout] Stripe session creation failed:", err);
    // Mark the order cancelled so it doesn't linger as pending_payment.
    await db
      .update(orders)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(orders.id, orderId));
    return Response.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}
