# 000 -- Architecture Overview

## System Context

An ecommerce website selling custom t-shirts. Printful handles production and shipping (print-on-demand). Stripe processes payments. We build everything else.

```
                         +---------+         +----------+
                         | Stripe  | <-----> |  Stripe   |
                         | Checkout|         | Webhooks  |
                         +----+----+         +-----+----+
                              |                     |
                    redirect  |                     | payment
                    to pay    |                     | confirmed
                              |                     |
                    +---------v---------+   +-------v--------+
                    |                   |   |                |
  Browser --------> |  Next.js App      |   |  Stripe        |
  (customer)        |  (Vercel)         |   |  Webhook       |
                    |                   |   |  Handler       |
                    |  Product Pages    |   |                |
                    |  Cart             |   +-------+--------+
                    |  Checkout         |           |
                    |  Account          |           | order
                    +-+----+----+------+           | created
                      |    |    |                   |
                      |    |    |          +--------v--------+
                      |    |    |          | Printful API    |
                      |    |    +--------->| (order submit)  |
                      |    |               |                 |
                      |    |               +--------+--------+
                      |    |                        |
                      |    |                        | webhooks
                      |    |               +--------v--------+
                      |    |               | Printful        |
                      |    |               | Webhook Handler |
                      |    |               | (order status)  |
                      |    |               +-----------------+
                      |    |
                +-----+    +-----+
                |               |
         +------v------+  +----v-----+
         |   Neon      |  | Vercel   |
         |  Postgres   |  |  Blob    |
         |  (DB)       |  | (images) |
         +-------------+  +----------+
```

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR, API routes, ISR, server components |
| Language | TypeScript | Type safety across the entire stack |
| UI | Tailwind CSS v4 + shadcn/ui | Free, production-grade, fast iteration |
| Database | Neon Postgres (free tier, 500MB) | Serverless postgres, Drizzle ORM |
| ORM | Drizzle | Type-safe, lightweight, no magic |
| Auth | Auth.js v5 (NextAuth) | Free, open-source, multiple providers |
| Payments | Stripe | Pay-as-you-go, best developer experience |
| Fulfillment | Printful API v2 | No monthly fee, t-shirt specialists |
| File storage | Vercel Blob (free tier) | For design files, product images |
| Email | Resend (free: 100/day) | Transactional emails |
| Hosting | Vercel (free tier, hobby) | Zero-config deploys, edge functions |
| Domain | Namecheap / Cloudflare ($10/yr) | -- |

## Monthly Cost Breakdown

| Item | Cost |
|---|---|
| Domain | ~$0.83/mo ($10/yr) |
| Vercel Hobby | $0 |
| Neon Postgres (free) | $0 |
| Resend (free tier) | $0 |
| Vercel Blob (free) | $0 |
| Stripe fees | ~2.9% + $0.30 per transaction |
| Printful costs | ~$10-15 per t-shirt (paid on customer order) |
| **Total base** | **~$0.83/mo** |

## Data Flow -- Key Operations

### Purchase flow
1. Customer browses product pages (ISR, served from edge)
2. Adds to cart (Zustand client state)
3. Proceeds to checkout -> `POST /api/stripe/checkout`
4. API creates Stripe Checkout Session with line items
5. Customer redirected to Stripe hosted checkout
6. Stripe confirms payment -> `POST /api/webhooks/stripe`
7. Webhook handler creates order in DB, calls Printful API
8. Printful starts production -> webhooks back to us
9. Order status updated, customer can track

### Product seeding flow
1. Admin action: sync products from Printful catalog
2. Fetch Printful product variants, store in our DB
3. Upload design files, link to product variants
4. Generate mockups via Printful Mockup API
5. Products go live on the site

## Project Structure

```
mediterranean-bear/
  app/
    (marketing)/        # Landing, about, etc.
    (shop)/             # Product listing, detail
    cart/               # Cart page
    checkout/           # Checkout
    account/            # Auth-protected pages
    admin/              # Admin dashboard
    api/                # API routes
      stripe/
      printful/
      products/
      cart/
      orders/
    layout.tsx          # Root layout
  components/
    ui/                 # shadcn components
    product/            # Product cards, detail, gallery
    cart/               # Cart drawer, line items
    checkout/           # Checkout form
    layout/             # Header, footer, navigation
  lib/
    db/
      schema.ts         # Drizzle schema definitions
      index.ts          # DB client
    stripe.ts           # Stripe client + helpers
    printful.ts         # Printful API client
    auth.ts             # Auth.js configuration
    email.ts            # Email sending
  plans/                # Planning documents
  public/               # Static assets
```

## Key Integration Points

### Stripe
- Stripe Checkout Sessions for payment collection
- Stripe webhooks for payment confirmation
- Stripe Customer Portal for future subscription management

### Printful
- Printful REST API v2 for order submission & catalog queries
- Printful webhooks for order status updates (shipped, failed, etc.)
- Printful Mockup Generator API for product images

## Security Considerations

- Printful API key stored as server-side env var only
- Stripe secret key stored as server-side env var only
- Stripe webhook signature verification on every event
- Printful webhook URL should use a shared secret for verification
- All customer data encrypted in transit (HTTPS)
- Auth.js JWT sessions (no server-side session store needed)
- Rate limiting on API routes via Vercel WAF or middleware
- No customer data ever exposed to client-side Printful API calls
