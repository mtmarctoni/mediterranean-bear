import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Mediterranean Bear -- Database Schema
 *
 * Conventions (see plans/001-database-schema.md):
 * - id is always uuid PK, generated server-side via gen_random_uuid()
 * - created_at / updated_at as timestamptz, default now()
 * - Soft deletes via deleted_at (nullable timestamptz) where applicable
 * - Foreign keys are uuid references, indexed
 * - All money stored as integer cents
 * - Table names: snake_case, plural
 */

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image_url: text("image_url"),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    base_price_cents: integer("base_price_cents").notNull(),
    category_id: uuid("category_id").references(() => categories.id),
    /** Printful store product ID for sync (see plans/002). */
    printful_store_product_id: integer("printful_store_product_id").notNull(),
    status: text("status")
      .$type<"draft" | "active" | "archived">()
      .notNull()
      .default("draft"),
    /** Array of mockup image URLs, ordered. */
    images: jsonb("images").$type<string[]>().notNull().default([]),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("products_category_id_idx").on(table.category_id),
    index("products_printful_store_product_id_idx").on(
      table.printful_store_product_id,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Product Variants                                                           */
/* -------------------------------------------------------------------------- */

export const product_variants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id),
    printful_variant_id: integer("printful_variant_id").notNull(),
    size: text("size").notNull(),
    color: text("color").notNull(),
    color_hex: text("color_hex").notNull(),
    price_override_cents: integer("price_override_cents"),
    status: text("status")
      .$type<"active" | "inactive">()
      .notNull()
      .default("active"),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("product_variants_product_id_size_color_idx").on(
      table.product_id,
      table.size,
      table.color,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Product Designs (print file placements)                                    */
/* -------------------------------------------------------------------------- */

export const product_designs = pgTable(
  "product_designs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id),
    placement: text("placement").notNull(),
    technique: text("technique").notNull(),
    print_file_url: text("print_file_url").notNull(),
    printful_file_id: integer("printful_file_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("product_designs_product_id_placement_idx").on(
      table.product_id,
      table.placement,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  auth_user_id: text("auth_user_id").unique(),
  avatar_url: text("avatar_url"),
  phone: text("phone"),
  role: text("role")
    .$type<"customer" | "admin">()
    .notNull()
    .default("customer"),
  /** Bcrypt hash of the customer's password (credentials provider only). Nullable for OAuth-only users. */
  password_hash: text("password_hash"),
  /** Last successful login timestamp (updated on sign-in). */
  last_login_at: timestamp("last_login_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Addresses                                                                  */
/* -------------------------------------------------------------------------- */

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** nullable if guest checkout */
    customer_id: uuid("customer_id").references(() => customers.id),
    first_name: text("first_name").notNull(),
    last_name: text("last_name").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state_code: text("state_code").notNull(),
    zip: text("zip").notNull(),
    country_code: text("country_code").notNull(),
    phone: text("phone"),
    is_default: boolean("is_default").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("addresses_customer_id_idx").on(table.customer_id)],
);

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-readable, e.g. 'MB-AX7K9P' */
    order_number: text("order_number").notNull().unique(),
    /** nullable for guest checkout */
    customer_id: uuid("customer_id").references(() => customers.id),
    email: text("email").notNull(),
    stripe_session_id: text("stripe_session_id").notNull(),
    stripe_payment_intent_id: text("stripe_payment_intent_id"),
    status: text("status")
      .$type<
        | "pending_payment"
        | "confirmed"
        | "submitted"
        | "in_progress"
        | "on_hold"
        | "cancelled"
        | "shipped"
        | "delivered"
        | "refunded"
        | "failed"
      >()
      .notNull()
      .default("pending_payment"),
    subtotal_cents: integer("subtotal_cents").notNull(),
    shipping_cents: integer("shipping_cents").notNull(),
    /** Tax collected (from Stripe) -- see plans/013 */
    tax_cents: integer("tax_cents").notNull().default(0),
    /** Subtotal + shipping + tax */
    total_cents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("eur"),
    shipping_address_id: uuid("shipping_address_id")
      .notNull()
      .references(() => addresses.id),
    billing_address_id: uuid("billing_address_id").references(
      () => addresses.id,
    ),
    /** from Printful webhook -- see plans/013 */
    shipping_carrier: text("shipping_carrier"),
    /** from Printful webhook -- see plans/013 */
    shipping_tracking: text("shipping_tracking"),
    /** set after Printful accepts */
    printful_order_id: integer("printful_order_id"),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("orders_customer_id_idx").on(table.customer_id),
    index("orders_shipping_address_id_idx").on(table.shipping_address_id),
    index("orders_billing_address_id_idx").on(table.billing_address_id),
    index("orders_stripe_session_id_idx").on(table.stripe_session_id),
  ],
);

/* -------------------------------------------------------------------------- */
/* Order Items                                                                */
/* -------------------------------------------------------------------------- */

export const order_items = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id),
    product_variant_id: uuid("product_variant_id")
      .notNull()
      .references(() => product_variants.id),
    /** Snapshot at time of order */
    product_name: text("product_name").notNull(),
    variant_size: text("variant_size").notNull(),
    variant_color: text("variant_color").notNull(),
    quantity: integer("quantity").notNull(),
    /** Price at time of purchase */
    unit_price_cents: integer("unit_price_cents").notNull(),
    printful_order_item_id: integer("printful_order_item_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.order_id),
    index("order_items_product_id_idx").on(table.product_id),
    index("order_items_product_variant_id_idx").on(table.product_variant_id),
  ],
);

/* -------------------------------------------------------------------------- */
/* Order Status History                                                       */
/* -------------------------------------------------------------------------- */

export const order_status_history = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    from_status: text("from_status"),
    to_status: text("to_status").notNull(),
    note: text("note"),
    created_by: text("created_by")
      .$type<"system" | "admin" | "printful">()
      .notNull()
      .default("system"),
    /** Provider's event ID for idempotency (nullable for non-webhook transitions) -- see plans/012 */
    webhook_event_id: text("webhook_event_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("order_status_history_order_id_idx").on(table.order_id),
    // Idempotency: duplicate webhook events are silently rejected.
    uniqueIndex("order_status_history_order_id_webhook_event_id_idx")
      .on(table.order_id, table.webhook_event_id)
      .where(sql`webhook_event_id IS NOT NULL`),
  ],
);

/* -------------------------------------------------------------------------- */
/* Cart Sessions                                                              */
/* -------------------------------------------------------------------------- */

export const cart_sessions = pgTable(
  "cart_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** nullable for anonymous carts */
    customer_id: uuid("customer_id").references(() => customers.id),
    /** Random token stored in cookie */
    session_token: text("session_token").notNull().unique(),
    /** Auto-cleanup old carts */
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("cart_sessions_customer_id_idx").on(table.customer_id)],
);

/* -------------------------------------------------------------------------- */
/* Cart Items                                                                 */
/* -------------------------------------------------------------------------- */

export const cart_items = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cart_session_id: uuid("cart_session_id")
      .notNull()
      .references(() => cart_sessions.id),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id),
    product_variant_id: uuid("product_variant_id")
      .notNull()
      .references(() => product_variants.id),
    /** Min 1, max 10 */
    quantity: integer("quantity").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_items_cart_session_id_product_variant_id_idx").on(
      table.cart_session_id,
      table.product_variant_id,
    ),
    index("cart_items_product_id_idx").on(table.product_id),
    index("cart_items_product_variant_id_idx").on(table.product_variant_id),
  ],
);
