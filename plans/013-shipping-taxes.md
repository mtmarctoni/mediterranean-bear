# 013 -- Dynamic Shipping & Taxes

## The Problem

Shipping and taxes are the most error-prone part of ecommerce. Get them wrong and you either:
- Lose money (undercharge the customer, eat the difference)
- Lose the sale (overcharge, customer abandons cart)
- Get fined (fail to remit sales tax correctly)

Printful's costs vary by:
- Destination country/state
- Product type (t-shirt vs hoodie vs mug)
- Print facility location (routed automatically by Printful)
- Quantity (bulk discounts)

We cannot hardcode this. We must query Printful live during checkout.

## Shipping: Printful Shipping API

### When to Call
**Before creating the Stripe Checkout Session.** The customer enters their shipping address on our checkout page, we query Printful for a live quote, then pass that amount to Stripe.

```
1. Customer on /checkout enters shipping address
2. Frontend POSTs to /api/shipping/quote
   Body: { items: [{ variantId, quantity }], address: {...} }
3. API calls Printful: POST /v2/shipping/rates
4. Returns: { rate: 595, currency: "EUR", retail_rate: 795 }
5. Frontend displays shipping cost to customer
6. On "Pay", we create Stripe session with shipping as a line item
```

### Printful API Endpoint

```
POST /v2/shipping/rates

Body:
{
  "recipient": {
    "address1": "19749 Dearborn St",
    "city": "Chatsworth",
    "state_code": "CA",
    "country_code": "US",
    "zip": "91311"
  },
  "items": [
    {
      "variant_id": 4011,     // Printful catalog variant ID
      "quantity": 2
    }
  ]
}

Response:
{
  "code": 200,
  "result": [
    {
      "id": "STANDARD",
      "name": "Standard Shipping",
      "rate": "5.95",        // Printful's cost to us
      "currency": "EUR",
      "retail_rate": "7.95", // Suggested retail rate (what we charge customer)
      "min_business_days": 2,
      "max_business_days": 7
    }
  ]
}
```

### What We Charge the Customer

We charge the `retail_rate` (Printful's suggested retail price). This gives us a small margin on shipping. Store this as `shipping_cents` on the order.

If the API call fails (rare), fall back to a flat-rate shipping estimate stored in env:

```
DEFAULT_SHIPPING_FLAT_RATE_CENTS=595
```

Display a note: "Final shipping calculated at checkout."
## Shipping on Product Pages (Estimate)

Before the customer enters their address, we show an **estimate** on the product page:

```
"Shipping: 5.95-7.95 EUR (calculated at checkout)"
```

This is a static range from Printful's documented rates for domestic US t-shirt orders. It sets expectations without promising an exact number.

## Taxes: Stripe Tax

### Why Stripe Tax
Sales tax/VAT rules are insanely complex:
- US: 50 states, each with different rules, nexus thresholds, product exemptions
- EU: VAT per country, MOSS/OSS regulations
- UK: VAT post-Brexit

**Stripe Tax** handles this automatically. It calculates the correct tax based on:
- Customer's address
- Your business address (tax nexus)
- Product tax category (apparel has special rules in some states)

### How It Works

When creating the Stripe Checkout Session, enable automatic tax:

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [...],
  automatic_tax: {
    enabled: true,
  },
  // No shipping_address_collection -- address collected on our /checkout page
  // Shipping address passed via metadata, shipping cost as a line item
  metadata: {
    orderId: order.id,
    shippingAddress: JSON.stringify(shippingAddress),
  },
  // ...
})
```

Stripe calculates and adds tax to the total at checkout. The customer sees it as a line item. Stripe remits nothing -- **you** are responsible for filing and remitting, but Stripe provides reports.

### Stripe Tax Pricing
- $0.50 per transaction (on top of payment processing fees)
- No monthly fee
- Only charged when tax is actually calculated (not for tax-exempt sales)

This is worth it. Manual tax handling is a nightmare.

### Alternative: Printful Calculates Tax
Printful also calculates tax and adds it to their invoice to you. But that's **their** tax, not what you charge the customer. You still need to collect tax from the customer at checkout. Stripe Tax is the cleaner path.

## Checkout Flow (Updated)

```
1. Customer on /cart clicks "Checkout"
2. Redirect to /checkout
3. Customer enters shipping address (form on our site)
4. Frontend calls /api/shipping/quote -> gets live rate
5. Display: Subtotal + Shipping + Tax (estimated) = Total
6. Customer clicks "Pay"
7. POST /api/stripe/checkout
   - Include shipping amount as a Stripe shipping line item
   - Enable automatic_tax
8. Stripe Checkout shows final total with exact tax
9. Customer pays
10. Webhook confirms -> we submit to Printful with the same address
```

## API Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/shipping/quote` | Get live shipping rate from Printful |
| POST | `/api/stripe/checkout` | Create session with shipping + tax |

## Database Impact

No schema change needed. The `orders` table already has `shipping_cents`. We add:

| Column | Type | Notes |
|---|---|---|
| tax_cents | integer | Tax collected (from Stripe) |
| shipping_carrier | text | nullable, from Printful webhook |
| shipping_tracking | text | nullable, from Printful webhook |

## Edge Cases

### Customer changes address in Stripe Checkout

We do NOT enable `shipping_address_collection` on the Stripe session. The shipping address is collected on our `/checkout` page and passed to Stripe as metadata. The customer cannot change their address on Stripe's hosted page. This eliminates the mismatch problem entirely.

Stripe Tax still calculates tax automatically using the address we pass via metadata. Shipping is charged as a flat line item based on the Printful quote we obtained on our checkout page.

### International shipping
- MVP ships to **Spain only** (EU)
- Printful has fulfillment centers in EU, so shipping within Spain is cost-effective
- Set `allowed_countries: ['ES']` on Stripe session
- Display estimated delivery times for Spain (2-7 business days via Printful)
- Expand to more EU countries, US, UK after validating the market

### Free shipping threshold
Future feature: offer free shipping on orders over X EUR. For MVP, charge shipping on every order to protect margins.

## Environment Variables

```
DEFAULT_SHIPPING_FLAT_RATE_CENTS=595
STRIPE_TAX_ENABLED=true
```
