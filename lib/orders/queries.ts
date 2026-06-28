/**
 * Order query helpers shared by customer account pages, customer-facing order
 * pages, the admin dashboard, and the webhook handlers.
 *
 * Centralised so the shape of an "order with items + history" payload is
 * consistent everywhere. See plans/007-order-lifecycle-admin.md.
 */
import { db } from "@/lib/db";
import {
  addresses,
  order_items,
  order_status_history,
  orders,
  products,
} from "@/lib/db/schema";
import type { CustomerRole } from "@/lib/auth/types";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "submitted"
  | "in_progress"
  | "on_hold"
  | "cancelled"
  | "shipped"
  | "delivered"
  | "refunded"
  | "failed";

export interface OrderItemDTO {
  id: string;
  productId: string;
  productVariantId: string;
  productName: string;
  variantSize: string;
  variantColor: string;
  quantity: number;
  unitPriceCents: number;
  image: string;
  printfulOrderItemId: number | null;
}

export interface OrderStatusEventDTO {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdBy: "system" | "admin" | "printful";
  webhookEventId: string | null;
  createdAt: Date;
}

export interface ShippingAddressDTO {
  id: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2: string | null;
  city: string;
  stateCode: string;
  zip: string;
  countryCode: string;
  phone: string | null;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  customerId: string | null;
  email: string;
  status: OrderStatus;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  printfulOrderId: number | null;
  shippingCarrier: string | null;
  shippingTracking: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  shippingAddress: ShippingAddressDTO;
  items: OrderItemDTO[];
  history: OrderStatusEventDTO[];
}

export interface OrderListFilters {
  status?: OrderStatus | null;
  fromDate?: Date | null;
  toDate?: Date | null;
  limit?: number;
  offset?: number;
}

export interface OrderListItemDTO {
  id: string;
  orderNumber: string;
  email: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: Date;
  printfulOrderId: number | null;
}

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

/** Helper to read the first image for an order item from its product. */
function firstImage(images: unknown): string {
  if (Array.isArray(images)) {
    const first = images[0];
    if (typeof first === "string") return first;
  }
  return "";
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Fetch a full order (items, shipping address, status history) by id.
 * Returns null when the order does not exist.
 */
export async function getOrderById(id: string): Promise<OrderDTO | null> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  const order = orderRows[0];
  if (!order) return null;
  return hydrateOrder(order);
}

/** Fetch a full order by its human-readable order number (e.g. MB-AX7K9P). */
export async function getOrderByOrderNumber(
  orderNumber: string,
): Promise<OrderDTO | null> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.order_number, orderNumber))
    .limit(1);
  const order = orderRows[0];
  if (!order) return null;
  return hydrateOrder(order);
}

/** Fetch an order by its Stripe Checkout Session id (used by webhooks). */
export async function getOrderByStripeSessionId(
  sessionId: string,
): Promise<OrderDTO | null> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.stripe_session_id, sessionId))
    .limit(1);
  const order = orderRows[0];
  if (!order) return null;
  return hydrateOrder(order);
}

/** Fetch an order by its Stripe Payment Intent id (used by refund webhooks). */
export async function getOrderByPaymentIntentId(
  paymentIntentId: string,
): Promise<OrderDTO | null> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.stripe_payment_intent_id, paymentIntentId))
    .limit(1);
  const order = orderRows[0];
  if (!order) return null;
  return hydrateOrder(order);
}

/** Fetch an order by its Printful order id (used by Printful webhooks). */
export async function getOrderByPrintfulOrderId(
  printfulOrderId: number,
): Promise<OrderDTO | null> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.printful_order_id, printfulOrderId))
    .limit(1);
  const order = orderRows[0];
  if (!order) return null;
  return hydrateOrder(order);
}

/** List orders for a given customer (account order history). */
export async function getOrdersByCustomerId(
  customerId: string,
): Promise<OrderListItemDTO[]> {
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.order_number,
      email: orders.email,
      status: orders.status,
      totalCents: orders.total_cents,
      createdAt: orders.created_at,
      printfulOrderId: orders.printful_order_id,
    })
    .from(orders)
    .where(eq(orders.customer_id, customerId))
    .orderBy(desc(orders.created_at));

  return rows.map((r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    email: r.email,
    status: r.status as OrderStatus,
    totalCents: r.totalCents,
    createdAt: r.createdAt,
    printfulOrderId: r.printfulOrderId,
  }));
}

/** List all orders (admin) with optional filters + pagination. */
export async function getAllOrders(
  filters: OrderListFilters = {},
): Promise<{ items: OrderListItemDTO[]; total: number }> {
  const limit = Math.max(1, Math.min(100, filters.limit ?? 50));
  const offset = Math.max(0, filters.offset ?? 0);

  const conditions = [];
  if (filters.status) {
    conditions.push(eq(orders.status, filters.status));
  }
  if (filters.fromDate) {
    conditions.push(gte(orders.created_at, filters.fromDate));
  }
  if (filters.toDate) {
    conditions.push(lte(orders.created_at, filters.toDate));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.order_number,
        email: orders.email,
        status: orders.status,
        totalCents: orders.total_cents,
        createdAt: orders.created_at,
        printfulOrderId: orders.printful_order_id,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.created_at))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(where),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      email: r.email,
      status: r.status as OrderStatus,
      totalCents: r.totalCents,
      createdAt: r.createdAt,
      printfulOrderId: r.printfulOrderId,
    })),
    total: countRows[0]?.count ?? 0,
  };
}

/** Admin dashboard stats. */
export async function getOrderStats(): Promise<{
  total: number;
  pending: number;
  shipped: number;
  revenueCents: number;
}> {
  const rows = await db
    .select({
      status: orders.status,
      totalCents: orders.total_cents,
    })
    .from(orders);

  let pending = 0;
  let shipped = 0;
  let revenueCents = 0;
  for (const r of rows) {
    if (
      r.status === "pending_payment" ||
      r.status === "confirmed" ||
      r.status === "submitted" ||
      r.status === "in_progress" ||
      r.status === "on_hold" ||
      r.status === "failed"
    ) {
      pending += 1;
    }
    if (r.status === "shipped" || r.status === "delivered") {
      shipped += 1;
      revenueCents += r.totalCents;
    }
    // Count confirmed+ revenue too (paid but not yet shipped).
    if (
      r.status === "confirmed" ||
      r.status === "submitted" ||
      r.status === "in_progress" ||
      r.status === "delivered"
    ) {
      revenueCents += r.totalCents;
    }
  }

  return {
    total: rows.length,
    pending,
    shipped,
    revenueCents,
  };
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Transition an order to a new status, recording an `order_status_history`
 * row. Idempotent for webhook-driven transitions: if `webhookEventId` is
 * provided and a history row already exists for it, the unique index rejects
 * the duplicate and we no-op (the status update is still applied, which is
 * safe because it's the same target status).
 *
 * Returns the updated order or null if it doesn't exist.
 */
export async function updateOrderStatus(input: {
  orderId: string;
  toStatus: OrderStatus;
  note?: string | null;
  createdBy?: "system" | "admin" | "printful";
  webhookEventId?: string | null;
}): Promise<OrderDTO | null> {
  const existing = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);
  const current = existing[0];
  if (!current) return null;

  const fromStatus = current.status as OrderStatus;
  const createdBy = input.createdBy ?? "system";

  await db
    .update(orders)
    .set({
      status: input.toStatus,
      updated_at: new Date(),
    })
    .where(eq(orders.id, input.orderId));

  // Insert history row; duplicate webhook events are rejected by the unique
  // index on (order_id, webhook_event_id) where webhook_event_id is not null.
  try {
    await db.insert(order_status_history).values({
      order_id: input.orderId,
      from_status: fromStatus,
      to_status: input.toStatus,
      note: input.note ?? null,
      created_by: createdBy,
      webhook_event_id: input.webhookEventId ?? null,
    });
  } catch {
    // Unique violation -> duplicate webhook event; safe to ignore.
  }

  return getOrderById(input.orderId);
}

/**
 * Update arbitrary order fields (e.g. printful_order_id, tracking). Does not
 * record history -- pair with updateOrderStatus when the change is a
 * transition.
 */
export async function patchOrder(
  orderId: string,
  patch: Partial<{
    printfulOrderId: number | null;
    stripePaymentIntentId: string | null;
    shippingCarrier: string | null;
    shippingTracking: string | null;
    status: OrderStatus;
    taxCents: number;
    totalCents: number;
  }>,
): Promise<void> {
  const set: Record<string, unknown> = { updated_at: new Date() };
  if (patch.printfulOrderId !== undefined) {
    set.printful_order_id = patch.printfulOrderId;
  }
  if (patch.stripePaymentIntentId !== undefined) {
    set.stripe_payment_intent_id = patch.stripePaymentIntentId;
  }
  if (patch.shippingCarrier !== undefined) {
    set.shipping_carrier = patch.shippingCarrier;
  }
  if (patch.shippingTracking !== undefined) {
    set.shipping_tracking = patch.shippingTracking;
  }
  if (patch.status !== undefined) {
    set.status = patch.status;
  }
  if (patch.taxCents !== undefined) {
    set.tax_cents = patch.taxCents;
  }
  if (patch.totalCents !== undefined) {
    set.total_cents = patch.totalCents;
  }
  await db.update(orders).set(set).where(eq(orders.id, orderId));
}

/* -------------------------------------------------------------------------- */
/* Hydration                                                                  */
/* -------------------------------------------------------------------------- */

/** Build a full OrderDTO from an orders row, fetching related data in parallel. */
async function hydrateOrder(order: typeof orders.$inferSelect): Promise<OrderDTO> {
  const [itemRows, historyRows, addressRows] = await Promise.all([
    db
      .select({
        id: order_items.id,
        productId: order_items.product_id,
        productVariantId: order_items.product_variant_id,
        productName: order_items.product_name,
        variantSize: order_items.variant_size,
        variantColor: order_items.variant_color,
        quantity: order_items.quantity,
        unitPriceCents: order_items.unit_price_cents,
        printfulOrderItemId: order_items.printful_order_item_id,
        images: products.images,
      })
      .from(order_items)
      .leftJoin(products, eq(products.id, order_items.product_id))
      .where(eq(order_items.order_id, order.id)),
    db
      .select()
      .from(order_status_history)
      .where(eq(order_status_history.order_id, order.id))
      .orderBy(asc(order_status_history.created_at)),
    db
      .select()
      .from(addresses)
      .where(eq(addresses.id, order.shipping_address_id))
      .limit(1),
  ]);

  const address = addressRows[0];

  return {
    id: order.id,
    orderNumber: order.order_number,
    customerId: order.customer_id,
    email: order.email,
    status: order.status as OrderStatus,
    subtotalCents: order.subtotal_cents,
    shippingCents: order.shipping_cents,
    taxCents: order.tax_cents,
    totalCents: order.total_cents,
    currency: order.currency,
    stripeSessionId: order.stripe_session_id,
    stripePaymentIntentId: order.stripe_payment_intent_id,
    printfulOrderId: order.printful_order_id,
    shippingCarrier: order.shipping_carrier,
    shippingTracking: order.shipping_tracking,
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    shippingAddress: address
      ? {
          id: address.id,
          firstName: address.first_name,
          lastName: address.last_name,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          stateCode: address.state_code,
          zip: address.zip,
          countryCode: address.country_code,
          phone: address.phone,
        }
      : {
          id: "",
          firstName: "",
          lastName: "",
          line1: "",
          line2: null,
          city: "",
          stateCode: "",
          zip: "",
          countryCode: "",
          phone: null,
        },
    items: itemRows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productVariantId: r.productVariantId,
      productName: r.productName,
      variantSize: r.variantSize,
      variantColor: r.variantColor,
      quantity: r.quantity,
      unitPriceCents: r.unitPriceCents,
      image: firstImage(r.images),
      printfulOrderItemId: r.printfulOrderItemId,
    })),
    history: historyRows.map((h) => ({
      id: h.id,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      note: h.note,
      createdBy: h.created_by as "system" | "admin" | "printful",
      webhookEventId: h.webhook_event_id,
      createdAt: h.created_at,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Authorization helper                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Returns true if the given session/customer may view the order: either the
 * order belongs to them, or they are an admin.
 */
export function canViewOrder(
  order: { customerId: string | null },
  viewer: { customerId: string; role: CustomerRole } | null,
): boolean {
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  return order.customerId === viewer.customerId;
}
