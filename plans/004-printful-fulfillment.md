# 004 -- Printful Fulfillment

## Overview

Printful handles all production and shipping. Our code communicates with Printful via their REST API v2 for:
- Submitting orders after payment
- Checking order status
- Getting product catalog info
- Configuring webhooks for status updates

## Authentication

Printful API uses Bearer token authentication:
```
Authorization: Bearer <api_key>
```

The API key is generated in Printful dashboard under "Stores" -> "API & Webhooks". Store as:
```
PRINTFUL_API_KEY=...
PRINTFUL_STORE_ID=...
PRINTFUL_WEBHOOK_SECRET=...
```

## Printful API Client

A thin wrapper in `lib/printful.ts` that handles:

```typescript
// Base URL: https://api.printful.com/v2
class PrintfulClient {
  async createOrder(order: CreateOrderInput): Promise<PrintfulOrder>
  async getOrder(printfulOrderId: number): Promise<PrintfulOrder>
  async getCatalogVariant(variantId: number): Promise<CatalogVariant>
  async listCatalogVariants(productId?: number): Promise<CatalogVariant[]>
  async configureWebhook(url: string, events: string[]): Promise<void>
}
```

## Order Submission Flow

When Stripe webhook confirms payment:

```
1. Order is "confirmed" in our DB
2. Build Printful order payload:
   {
     recipient: {
       name, address1, city, state_code,
       country_code, zip, email
     },
     items: [{
       catalog_variant_id: <printful_variant_id>,
       quantity: <n>,
       placements: [{
         placement: "front",
         technique: "dtg",
         layers: [{
           type: "file",
           url: <print_file_url>
         }]
       }]
     }],
     retail_costs: {
       currency: "EUR",
       subtotal: <subtotal>,
       shipping: <shipping>
     }
   }
3. POST /v2/orders
4. Store printful_order_id on our order record
5. Update our order status to "submitted" (immediately on successful POST)
```

**Status timing:** The order becomes `submitted` as soon as we receive a successful response from `POST /v2/orders`. The Printful `order.created` webhook is treated as an idempotency confirmation -- if it arrives and the order is already `submitted`, we return 200 without changes. If it arrives and the order is still `confirmed` (e.g., our POST response was lost), we update to `submitted` using the `printful_order_id` from the webhook payload.

**Asynchronous submission:** To avoid Stripe webhook timeouts (see plan 012), Printful submission should be done asynchronously:
1. Stripe webhook marks order `confirmed` and returns 200 immediately
2. Background job (or inline async) picks up `confirmed` orders and submits to Printful
3. On success, status -> `submitted`. On failure, status -> `failed` (see plan 007).

## Printful V2 API Endpoints Used

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/v2/orders` | Create fulfillment order |
| GET | `/v2/orders/{id}` | Get order details |
| POST | `/v2/orders/{id}/confirm` | Confirm a draft order |
| GET | `/v2/catalog-variants` | List catalog products |
| GET | `/v2/catalog-variants/{id}` | Get variant details |
| POST | `/v2/files` | Upload print file |
| POST | `/v2/mockup-generator/generate` | Generate mockups |
| POST | `/v2/webhooks` | Configure webhook URL & events |

## Webhook Configuration

Printful sends webhooks for order status changes. Configure in Printful dashboard or via API:

**Events to subscribe to:**
- `order.created` -- Printful received the order
- `order.in_progress` -- Printing started
- `order.on_hold` -- Issue with order (check email)
- `order.canceled` -- Order cancelled by Printful
- `order.fulfilled` -- All items shipped
- `package.shipped` -- A package was shipped (has tracking)
- `package.returned` -- Package returned

**Webhook endpoint:** `POST /api/webhooks/printful`

**Verification:** Printful sends a signature header. Verify with shared secret (set up in Printful dashboard).

## Order Status Mapping

| Our Status | Printful Event | Notes |
|---|---|---|
| submitted | `order.created` | Initial submission |
| in_progress | `order.in_progress` | Currently being printed |
| on_hold | `order.on_hold` | Check Printful dashboard |
| cancelled | `order.canceled` | Issue, contact support |
| shipped | `package.shipped` | Includes tracking number |
| delivered | `package.shipped` + time | We infer from tracking |
| failed | (no event) | Manual admin intervention |

## Error Handling

- **Order creation fails**: Keep order as "confirmed" status, log error, notify admin
- **Retry**: Admin can retry submission via admin panel
- **Rate limits**: Printful uses leaky bucket algorithm, handle with retry-after headers
- **Invalid variant**: Log and flag for product metadata update

## Product Sync

For MVP, products are seeded manually (admin action calls Printful API to fetch available variants, stores in our DB). Future iterations could add automatic sync on a schedule.

## Printful Dashboard

We still need a Printful account and to configure:
1. Billing info (they charge per order fulfilled)
2. Shipping settings (rates, origin address)
3. Branding options (packing slip, return address)
4. Tax settings
