# 003 -- Stripe Payments

## Approach

Use **Stripe Checkout Sessions** (hosted payment page). This is the simplest, most secure approach:
- Stripe handles PCI compliance
- Stripe hosts the payment form
- Customer is redirected back to our site on completion
- We handle the confirmation via webhook
- MVP ships to Spain only: `allowed_countries: ['ES']`

## Checkout Flow

```
1. Customer on /cart clicks "Checkout"
2. Redirect to /checkout (our own page)
3. Customer enters shipping address on our site
4. Frontend calls /api/shipping/quote -> gets live rate from Printful
5. Display: Subtotal + Shipping + Tax (estimated) = Total
6. Customer clicks "Pay"
7. Frontend POSTs to /api/stripe/checkout
   Body: { cartSessionToken, shippingAddress, shippingRateCents }

8. API route:
   a. Fetches cart items from DB (server-side, never trust client items)
   b. Creates Stripe Checkout Session:
      - Line items from cart
      - shipping_address_collection: NOT enabled (address collected on our site)
      - shipping amount passed as a line item (flat, from Printful quote)
      - automatic_tax: { enabled: true } (Stripe calculates tax from address metadata)
      - customer_email from auth or input
      - metadata: { orderId: "uuid", shippingAddress: JSON }
   c. Creates order record in DB (status: pending_payment)
   d. Returns { url: "https://checkout.stripe.com/..." }

9. Frontend redirects customer to Stripe

10. Customer pays on Stripe's page (no address editing in Stripe)

11. Stripe sends webhook: checkout.session.completed
    POST /api/webhooks/stripe
    a. Verify webhook signature
    b. Find order by metadata.orderId
    c. Update order:
       - status = confirmed
       - stripe_payment_intent_id = session.payment_intent
    d. Submit order to Printful (see 004-printful-fulfillment.md)
    e. Send confirmation email to customer

12. Customer redirected to /order/{id}/confirmation
    Shows: order number, items, estimated delivery
```

## API Routes

### `POST /api/stripe/checkout`
- Auth: optional (guest checkout allowed)
- Input: `{ cartSessionToken, shippingAddress, shippingRateCents }`
- Output: `{ url: string }`
- Note: Cart items are always fetched server-side from the cart session. Client never sends item list.

### `POST /api/webhooks/stripe`
- Public (verified by signature)
- Handles:
  - `checkout.session.completed` -- payment confirmed
  - `checkout.session.expired` -- session expired, cancel order
  - `charge.refunded` -- order refunded, update status

## Stripe Dashboard Setup Required

1. Create Stripe account
2. Get publishable key (starts with `pk_live_`)
3. Get secret key (starts with `sk_live_`)
4. Configure webhook endpoint pointing to `/api/webhooks/stripe`
5. Get webhook signing secret (starts with `whsec_`)
6. Configure success/cancel URLs (or pass dynamically)

## Environment Variables

```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Guest Checkout vs. Customer Checkout

For MVP:
- Guest checkout: customer enters email before Stripe redirect
- Customer checkout: if logged in, auto-fill email and offer saved address

Guest orders are still tracked via the order ID returned in success URL.

## Webhook Idempotency

Stripe may send the same event multiple times. Handle via:
1. Check `stripe_session_id` on order before updating
2. If already processed, return 200 immediately
3. Use Stripe's `Idempotency-Key` header where applicable

## Error Handling

- Failed payment: Stripe shows error to customer, they can retry
- Expired session: webhook cancels the order
- Webhook processing failure: Stripe retries with exponential backoff
- Printful submission failure after payment: order stays "confirmed", admin intervention needed
