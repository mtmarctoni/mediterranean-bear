# 001 -- Database Schema

## Platform

**Neon Postgres (serverless)** -- free tier includes 500MB storage, branching for dev, autoscaling.

**Drizzle ORM** -- lightweight, type-safe, generates SQL migrations from schema definition.

## Conventions

- `id` is always `uuid` primary key, generated server-side via `gen_random_uuid()`
- `created_at` and `updated_at` as `timestamp with time zone`, default `now()`
- Soft deletes via `deleted_at` (nullable timestamp)
- Foreign keys are `uuid` references, indexed
- All money stored as integer **cents** (stripe convention)
- Table names: `snake_case`, plural

## Tables

### products

Stores each product synced from Printful store (t-shirt design, mug, phone case, etc.).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | Customer-facing name |
| slug | text UNIQUE | URL-friendly, auto-generated from name |
| description | text | Product description / story |
| base_price_cents | integer | Price in cents (e.g. 2999 = 29.99 EUR) |
| category_id | uuid FK -> categories.id | nullable |
| printful_store_product_id | integer | Printful store product ID for sync |
| status | text | 'draft' | 'active' | 'archived' |
| images | jsonb | Array of mockup image URLs, ordered |
| sort_order | integer | For manual ordering |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | nullable |

### categories

For organizing products (e.g. "Classic Fit", "Premium", "Limited Edition").

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| slug | text UNIQUE | |
| description | text | nullable |
| image_url | text | nullable |
| sort_order | integer | |
| created_at | timestamptz | |

### product_variants

Each combination of size + color for a product, mapped to a Printful catalog variant.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| product_id | uuid FK -> products.id | |
| printful_variant_id | integer | Printful's internal variant ID |
| size | text | e.g. 'S', 'M', 'L', 'XL', '2XL' |
| color | text | e.g. 'Black', 'White', 'Navy' |
| color_hex | text | Hex code for swatch display |
| price_override_cents | integer | nullable, if different from product base |
| status | text | 'active' | 'inactive' |
| sort_order | integer | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Index: `(product_id, size, color)` unique

### product_designs

Print files for each placement on a product variant.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| product_id | uuid FK -> products.id | |
| placement | text | 'front', 'back', 'left_sleeve', 'right_sleeve' |
| technique | text | 'dtg', 'embroidery', 'dtf', 'all-over' |
| print_file_url | text | URL to the uploaded print file (PNG) |
| printful_file_id | integer | nullable, Printful file library ID |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Index: `(product_id, placement)` unique

### customers

Synced from Auth.js on first login or checkout.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | text UNIQUE | |
| name | text | nullable |
| auth_user_id | text UNIQUE | Auth.js user ID |
| avatar_url | text | nullable |
| phone | text | nullable |
| role | text | 'customer' \| 'admin', default 'customer' |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### addresses

Shipping addresses for customers.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| customer_id | uuid FK -> customers.id | nullable if guest checkout |
| first_name | text | |
| last_name | text | |
| line1 | text | |
| line2 | text | nullable |
| city | text | |
| state_code | text | 2-letter code |
| zip | text | |
| country_code | text | 2-letter ISO |
| phone | text | nullable |
| is_default | boolean | default false |
| created_at | timestamptz | |

Index: `(customer_id)`

### orders

Each customer order.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_number | text UNIQUE | Human-readable, e.g. 'MB-AX7K9P' (6 random alphanumeric) |
| customer_id | uuid FK -> customers.id | nullable for guest checkout |
| email | text | Customer email (always present) |
| stripe_session_id | text | Stripe Checkout Session ID |
| stripe_payment_intent_id | text | nullable, set after payment |
| status | text | See order lifecycle |
| subtotal_cents | integer | Sum of line items before shipping/tax |
| shipping_cents | integer | |
| tax_cents | integer | Tax collected (from Stripe) |
| total_cents | integer | Subtotal + shipping + tax |
| currency | text | 'eur' |
| shipping_address_id | uuid FK -> addresses.id | |
| billing_address_id | uuid FK -> addresses.id | |
| shipping_carrier | text | nullable, from Printful webhook |
| shipping_tracking | text | nullable, from Printful webhook |
| printful_order_id | integer | nullable, set after Printful accepts |
| notes | text | nullable, customer notes |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### order_items

Individual line items within an order.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK -> orders.id | |
| product_id | uuid FK -> products.id | |
| product_variant_id | uuid FK -> product_variants.id | |
| product_name | text | Snapshot at time of order |
| variant_size | text | Snapshot |
| variant_color | text | Snapshot |
| quantity | integer | |
| unit_price_cents | integer | Price at time of purchase |
| printful_order_item_id | integer | nullable, for tracking |
| created_at | timestamptz | |

### order_status_history

Audit log of status changes.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK -> orders.id | |
| from_status | text | nullable |
| to_status | text | |
| note | text | nullable |
| created_by | text | 'system' | 'admin' | 'printful' |
| webhook_event_id | text | Provider's event ID for idempotency (nullable for non-webhook transitions) |
| created_at | timestamptz | |

Index: `(order_id, webhook_event_id)` unique (where webhook_event_id is not null)

### cart_sessions

Anonymous or authenticated cart storage.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| customer_id | uuid FK -> customers.id | nullable |
| session_token | text UNIQUE | Random token stored in cookie |
| expires_at | timestamptz | Auto-cleanup old carts |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### cart_items

Items in a cart session.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| cart_session_id | uuid FK -> cart_sessions.id | |
| product_id | uuid FK -> products.id | |
| product_variant_id | uuid FK -> product_variants.id | |
| quantity | integer | Min 1, max 10 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Index: `(cart_session_id, product_variant_id)` unique

## Migration Strategy

- Drizzle generates SQL migration files in `lib/db/migrations/`
- Run via `drizzle-kit push` during development
- Run via `drizzle-kit migrate` in CI/deploy

## Key Relationships (ASCII)

```
products 1---* product_variants
products 1---* product_designs
products *---1 categories

customers 1---* addresses
customers 1---* orders

orders 1---* order_items
orders 1---* order_status_history
orders *---1 addresses (shipping)
orders *---1 addresses (billing)

order_items *---1 products
order_items *---1 product_variants

cart_sessions 1---* cart_items
cart_items *---1 products
cart_items *---1 product_variants
```
