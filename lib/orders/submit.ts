/**
 * Printful order submission logic.
 *
 * After a Stripe payment is confirmed, we build a Printful order payload from
 * the DB order (items + variants + designs) and POST it to Printful. On
 * success the order becomes `submitted` and we store the `printful_order_id`.
 * On failure it becomes `failed` and we alert the admin.
 *
 * Per plans/012, this runs asynchronously from the Stripe webhook so the
 * webhook can return 200 quickly. Errors are caught and logged so a
 * fire-and-forget call never rejects unhandled.
 *
 * See plans/004-printful-fulfillment.md.
 */
import { db } from "@/lib/db";
import {
  product_designs,
  product_variants,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { printful, PrintfulRequestError, type CreateOrderInput } from "@/lib/printful";
import { sendAdminFailureAlert } from "@/lib/email";
import {
  getOrderById,
  patchOrder,
  updateOrderStatus,
  type OrderDTO,
} from "@/lib/orders/queries";

/** Build the Printful `POST /v2/orders` payload from a hydrated order. */
async function buildPrintfulPayload(order: OrderDTO): Promise<CreateOrderInput> {
  const variantIds = order.items.map((i) => i.productVariantId);

  // Fetch all variants for the order's items.
  const variantRows = await Promise.all(
    variantIds.map((id) =>
      db
        .select({
          id: product_variants.id,
          printfulVariantId: product_variants.printful_variant_id,
          productId: product_variants.product_id,
        })
        .from(product_variants)
        .where(eq(product_variants.id, id))
        .limit(1),
    ),
  ).then((rows) => rows.map((r) => r[0]).filter(Boolean) as NonNullable<typeof rows[0][0]>[]);

  const variantMap = new Map(variantRows.map((v) => [v.id, v.printfulVariantId]));
  const variantToProduct = new Map(variantRows.map((v) => [v.id, v.productId]));

  // Fetch designs for each unique product so we can attach print files.
  const productIds = Array.from(new Set(variantRows.map((v) => v.productId)));
  const designRows = (
    await Promise.all(
      productIds.map((pid) =>
        db
          .select()
          .from(product_designs)
          .where(eq(product_designs.product_id, pid)),
      ),
    )
  ).flat();

  const designsByProduct = new Map<string, typeof designRows>();
  for (const d of designRows) {
    const list = designsByProduct.get(d.product_id) ?? [];
    list.push(d);
    designsByProduct.set(d.product_id, list);
  }

  const items: CreateOrderInput["items"] = order.items.map((item) => {
    const printfulVariantId = variantMap.get(item.productVariantId);
    if (!printfulVariantId) {
      throw new Error(
        `No Printful variant mapping for order item ${item.id} (variant ${item.productVariantId})`,
      );
    }
    const productId = variantToProduct.get(item.productVariantId) ?? "";
    const designs = designsByProduct.get(productId) ?? [];
    return {
      variant_id: printfulVariantId,
      quantity: item.quantity,
      placements: designs
        .filter((d) => d.print_file_url)
        .map((d) => ({
          placement: d.placement,
          technique: d.technique,
          layers: [{ type: "file" as const, url: d.print_file_url }],
        })),
    };
  });

  const addr = order.shippingAddress;
  return {
    external_id: order.id,
    shipping: "STANDARD",
    recipient: {
      name: `${addr.firstName} ${addr.lastName}`.trim(),
      address1: addr.line1,
      address2: addr.line2 ?? undefined,
      city: addr.city,
      state_code: addr.stateCode || undefined,
      zip: addr.zip,
      country: addr.countryCode,
      phone: addr.phone ?? undefined,
      email: order.email,
    },
    items,
    currency: "EUR",
    retail_costs: {
      currency: "EUR",
      subtotal: order.subtotalCents / 100,
      shipping: order.shippingCents / 100,
      tax: order.taxCents / 100,
    },
  };
}

/**
 * Submit a confirmed order to Printful.
 *
 * Updates the order status to `submitted` on success (storing the
 * `printful_order_id`) or `failed` on failure (with an admin alert email).
 *
 * Safe to call fire-and-forget: all errors are caught and recorded.
 */
export async function submitOrderToPrintful(orderId: string): Promise<void> {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      console.error(`[printful] order ${orderId} not found`);
      return;
    }
    if (order.status !== "confirmed" && order.status !== "failed") {
      // Only submit confirmed orders (or retry failed ones).
      return;
    }

    const payload = await buildPrintfulPayload(order);
    const printfulOrder = await printful.createOrder(payload);

    await patchOrder(orderId, {
      printfulOrderId: printfulOrder.id,
      status: "submitted",
    });
    await updateOrderStatus({
      orderId,
      toStatus: "submitted",
      note: `Printful order ${printfulOrder.id} created`,
      createdBy: "system",
    });
  } catch (err) {
    const message =
      err instanceof PrintfulRequestError
        ? `Printful API error (${err.code}): ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
    console.error(`[printful] submission failed for order ${orderId}:`, message);

    await patchOrder(orderId, { status: "failed" });
    await updateOrderStatus({
      orderId,
      toStatus: "failed",
      note: message,
      createdBy: "system",
    });

    // Alert the admin (best-effort, never throws).
    try {
      const refreshed = await getOrderById(orderId);
      if (refreshed) {
        await sendAdminFailureAlert(refreshed, message);
      }
    } catch (emailErr) {
      console.error(`[printful] admin alert email failed:`, emailErr);
    }
  }
}
