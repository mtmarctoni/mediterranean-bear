# 012 -- Webhooks (The Glue)

## Why a Separate Document

Webhooks are the nervous system of this app. Stripe and Printful operate asynchronously -- our server must listen for their events, verify them, and react. This document consolidates the webhook architecture across both providers so the security model, idempotency, and error handling are defined in one place.

## Two Webhook Receivers

| Source | Endpoint | Purpose |
|---|---|---|
| Stripe | `POST /api/webhooks/stripe` | Payment events |
| Printful | `POST /api/webhooks/printful` | Fulfillment events |

Both endpoints are **public** (no auth header) but **signature-verified**.

## Security: Signature Verification

### Stripe
Stripe signs every event with HMAC-SHA256 using your webhook signing secret.

```typescript
import Stripe from 'stripe'

export async function verifyStripeSignature(
  req: Request,
  body: string,
): Promise<Stripe.Event> {
  const signature = req.headers.get('stripe-signature')
  if (!signature) throw new Error('Missing signature')

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  )
  return event
}
```

**Critical:** Use the **raw request body**, not parsed JSON, for verification. In Next.js App Router this means reading the body as text before parsing.

### Printful
Printful sends an `X-PF-Signature` header (HMAC-SHA256 of the JSON body). We verify with a shared secret configured in the Printful dashboard.

```typescript
import crypto from 'crypto'

export function verifyPrintfulSignature(
  body: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.PRINTFUL_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature),
  )
}
```

**Always use `crypto.timingSafeEqual`** to prevent timing attacks.

## Stripe Events We Handle

| Event | Action |
|---|---|
| `checkout.session.completed` | Payment confirmed. Create order in DB. Submit to Printful. Send confirmation email. |
| `checkout.session.expired` | Customer abandoned. Mark order `cancelled`. Free up any held inventory. |
| `charge.refunded` | Refund processed. Update order status. Email customer. |
| `charge.dispute.created` | Customer disputed charge. Flag order for admin review. |

## Printful Events We Handle

| Event | Action |
|---|---|
| `order.created` | Printful accepted the order. Update status to `submitted`. |
| `order.in_progress` | Printing started. Update status to `in_progress`. |
| `order.on_hold` | Issue detected (address, stock, payment). Update status to `on_hold`. Alert admin. |
| `order.canceled` | Printful cancelled. Update status to `cancelled`. Alert admin to handle refund. |
| `order.fulfilled` | All items shipped. Update status to `shipped` (or `delivered` if single package). |
| `package.shipped` | A package shipped with tracking. Store tracking number + carrier. Email customer. |
| `package.returned` | Package returned to Printful. Alert admin. |

## Idempotency

Both Stripe and Printful may deliver the same event multiple times (network retries, edge cases). Every handler must be idempotent.

**Strategy:** Before applying any state transition, check the current state.

```typescript
// Stripe example
if (order.status !== 'pending_payment') {
  return new Response('Already processed', { status: 200 })
}
order.status = 'confirmed'
```

**For order_status_history:** Use a unique constraint on `(order_id, webhook_event_id)` so duplicate inserts are silently rejected. Store the provider's event ID on each history row.

## Error Handling

### Handler fails
- Return non-2xx status -> provider retries with exponential backoff
- Stripe: retries for up to 3 days
- Printful: retries per their policy

### Poison messages
If a webhook consistently fails (e.g., malformed data), it will retry forever. Mitigation:
- Log every failure with full context
- After N failed attempts, mark as `failed_webhook` in a dead-letter table
- Alert admin via email

### Timeouts
Webhook handlers must respond quickly (< 5 seconds). For long-running work (Printful order submission), **do it asynchronously**:

```
Stripe webhook receives payment confirmation
  -> Mark order "confirmed" in DB (fast)
  -> Enqueue Printful submission job (fast)
  -> Return 200 to Stripe immediately

Background job picks up "confirmed" orders and submits to Printful
  -> On success: status -> "submitted", store printful_order_id
  -> On failure: status -> "failed", alert admin (see plan 007)
```

This avoids Stripe webhook timeouts if Printful's API is slow.

**Printful `order.created` webhook** is treated as an idempotency confirmation. If it arrives and the order is already `submitted`, we return 200 without changes. If it arrives and the order is still `confirmed` (our POST response was lost), we update to `submitted`.

## Local Development

### Stripe CLI
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
This forwards live Stripe test-mode events to your local server. Print the webhook secret and add to `.env.local`.

### Printful
Printful has a **Webhook Simulator** in their dashboard:
1. Go to Stores -> API & Webhooks -> Webhook Simulator
2. Select event type (e.g., `package.shipped`)
3. Click "Send"
4. Event fires to your tunneled URL (use `ngrok` or Vercel preview deploy)

## Webhook Configuration Checklist

### Stripe (Dashboard)
- [ ] Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Subscribe to: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`
- [ ] Copy signing secret -> `STRIPE_WEBHOOK_SECRET`

### Printful (Dashboard)
- [ ] Set webhook URL: `https://yourdomain.com/api/webhooks/printful`
- [ ] Subscribe to: `order.*`, `package.*` events
- [ ] Set shared secret -> `PRINTFUL_WEBHOOK_SECRET`
- [ ] Test via Webhook Simulator

## Data Model Addition

Add to `order_status_history` (from 001):

| Column | Type | Notes |
|---|---|---|
| webhook_event_id | text | Provider's event ID for idempotency |

Unique index on `(order_id, webhook_event_id)`.
