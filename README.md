# Mediterranean Bear

Mediterranean-inspired print-on-demand t-shirts and accessories. Designs draw
from Mallorca: the Tramuntana mountains, the Mediterranean sea, and warm
summer sunsets. Currency: EUR. Ships to Spain only.

Production is handled by [Printful](https://www.printful.com) (print-on-demand),
payments by [Stripe](https://stripe.com), email by [Resend](https://resend.com),
and the database on [Neon](https://neon.tech) Postgres. The app runs on
Next.js 16 (App Router) and deploys to [Vercel](https://vercel.com) (Frankfurt
region, for the EU/Spain audience).

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, server components, ISR) |
| Language | TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui (CSS-based theme, no `tailwind.config.ts`) |
| Database | Neon Postgres + Drizzle ORM |
| Auth | Auth.js v5 (NextAuth) - email/password credentials |
| Payments | Stripe (Stripe Checkout + webhooks) |
| Fulfillment | Printful API v2 (order submit + webhooks) |
| Email | Resend + React Email |
| Cart | Zustand (client) + cookie-backed server cart |
| Hosting | Vercel (Hobby tier) |

## Prerequisites

- **Node.js** 18.18+ (recommend the active LTS; the project pins `next@16.2.9`)
- **pnpm** (this project uses pnpm exclusively - never `npm` or `yarn`)
- A Neon Postgres database (free tier works)
- Stripe account (test mode for development)
- Printful store + API key
- Resend account (free tier: 100 emails/day)

Install pnpm if you don't have it:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Setup

1. **Clone the repo**

   ```bash
   git clone <repo-url> mediterranean-bear
   cd mediterranean-bear
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   Copy the example file and fill in real values:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your Stripe, Printful, Neon, and Resend keys. See
   the [Environment Variables](#environment-variables) section below.

4. **Provision the database**

   Create a Neon project, copy the pooled connection string into
   `DATABASE_URL`, then generate and apply migrations:

   ```bash
   pnpm db:generate   # create a migration from schema.ts
   pnpm db:migrate     # apply pending migrations to Neon
   ```

   For quick iteration during development you can also push the schema
   directly (no migration files recorded):

   ```bash
   pnpm db:push
   ```

5. **Start the dev server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

6. **Seed the catalog** (optional, but needed to see products)

   Sync products from Printful via the admin panel (`/admin/products/sync`)
   or `POST /api/products/sync`.

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run `tsc --noEmit` (no type errors) |
| `pnpm db:generate` | Generate a Drizzle migration from `schema.ts` |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:push` | Push schema changes directly (dev only - no migration history) |
| `pnpm db:studio` | Open Drizzle Studio (a DB browser GUI) |

## Environment Variables

All secrets live in `.env.local` (gitignored) or in the Vercel project settings
for production. `.env.example` is the canonical list and is committed.

### App

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | The public site URL (dev: `https://mediterraneanbear.marctonimas.com`, prod: `https://mediterraneanbear.com`) |
| `NEXT_PUBLIC_SITE_NAME` | Display name of the store |

### Database

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled Postgres connection string (`postgres://...?sslmode=require`) |

### Auth (Auth.js v5)

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret used to sign session JWTs (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | Set to `true` when deployed behind a proxy / on Vercel |

### Stripe

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe API secret (`sk_test_...` / `sk_live_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the webhook endpoint (`whsec_...`) |

### Printful

| Variable | Description |
|---|---|
| `PRINTFUL_API_KEY` | Printful REST API v2 key |
| `PRINTFUL_STORE_ID` | Printful store id |
| `PRINTFUL_WEBHOOK_SECRET` | Shared secret used to verify the `X-PF-Signature` header |

### Resend (email)

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key (`re_...`) |
| `EMAIL_FROM` | Production `From` address (`Mediterranean Bear <hello@mediterraneanbear.com>`) |
| `EMAIL_FROM_DEV` | Development `From` address (`Mediterranean Bear <dev@mediterraneanbear.com>`) |
| `ADMIN_EMAIL` | Optional inbox for admin failure alerts (defaults to `EMAIL_FROM`) |

### Shipping

| Variable | Description |
|---|---|
| `DEFAULT_SHIPPING_FLAT_RATE_CENTS` | Flat-rate shipping in cents (e.g. `595` = 5.95 EUR) |
| `STRIPE_TAX_ENABLED` | `true` to enable Stripe automatic tax |

### Vercel Blob (optional)

| Variable | Description |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (for design file uploads) |

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Import the project in Vercel (`vercel.com/new`). Vercel auto-detects
   Next.js; `vercel.json` pins the `fra1` (Frankfurt) region for the EU/Spain
   audience.
3. Add all environment variables from `.env.example` in **Project Settings ->
   Environment Variables**. Use different values for Preview vs Production.
4. Add your production domain (`mediterraneanbear.com`) under **Settings ->
   Domains**. Vercel provisions SSL automatically.
5. Run database migrations before the first deploy (or wire them into a
   Vercel Post-Deploy Hook):

   ```bash
   pnpm db:migrate
   ```

6. Every push to `main` deploys to production; PRs get preview deploys.

### Domains

- **Development:** `mediterraneanbear.marctonimas.com` (CNAME on
  `marctonimas.com` DNS pointing to Vercel)
- **Production:** `mediterraneanbear.com`

Update `NEXT_PUBLIC_SITE_URL` when switching from the dev to prod domain.

## Webhook Setup

Both webhooks must be configured in their respective dashboards. Each handler
verifies its signature and is idempotent (safe to receive duplicate events).

### Stripe

1. Stripe Dashboard -> Developers -> Webhooks -> Add endpoint.
2. Endpoint URL: `https://<your-domain>/api/webhooks/stripe`
3. Subscribe to events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `charge.refunded`
   - `charge.dispute.created`
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

For local development use the Stripe CLI to forward events:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Printful

1. Printful Dashboard -> Stores -> Your Store -> API & Webhooks.
2. Webhook URL: `https://<your-domain>/api/webhooks/printful`
3. Subscribe to events:
   - `order.created`
   - `order.in_progress`
   - `order.on_hold`
   - `order.canceled`
   - `order.fulfilled`
   - `package.shipped`
   - `package.returned`
4. Copy the shared secret into `PRINTFUL_WEBHOOK_SECRET`.

## Database Migrations

Schema changes are made in `lib/db/schema.ts`. To create and apply a
migration:

```bash
pnpm db:generate   # create migration SQL from the schema diff
pnpm db:migrate    # apply to Neon
```

For quick iteration during development:

```bash
pnpm db:push       # push schema directly (no migration files)
pnpm db:studio     # browse data in a local GUI
```

Production migrations should be backward-compatible. Neon branching allows
instant rollback if a migration goes wrong.

## Project Structure

```
mediterranean-bear/
  app/
    (marketing)/        # About + future marketing pages
    (shop)/             # Product listing + detail
    (auth)/             # Sign-in, sign-up, account (customer)
    account/            # Auth-protected customer pages
    admin/              # Admin dashboard, orders, products
    api/                # API routes (cart, orders, stripe, printful, products, auth)
    cart/               # Cart page
    checkout/           # Checkout
    order/[id]/         # Public order detail (UUID-gated)
    layout.tsx          # Root layout (header, footer, cart drawer, toaster)
    page.tsx            # Homepage
    sitemap.ts          # Dynamic sitemap.xml
    robots.ts           # robots.txt
  components/
    ui/                 # shadcn components
    product/            # Product cards, gallery, variant selector
    cart/               # Cart drawer + line items
    layout/             # Header, footer
    checkout/
    account/
    admin/
  emails/               # React Email templates (order confirmation, shipping, etc.)
  lib/
    db/                 # Drizzle schema + client
    orders/             # Order queries + Printful submission
    products/           # Product queries + sync
    auth.ts             # Auth.js config
    email.tsx           # Resend client + send helpers
    printful.ts         # Printful API client
    stripe.ts           # Stripe client
  public/               # Static assets
  plans/                # Planning documents (phase 0-13)
  proxy.ts              # Next.js 16 proxy (auth-gated routes)
  vercel.json           # Vercel config (region pin)
```

## Core Web Vitals Targets

| Metric | Target |
|---|---|
| LCP | < 2.5s |
| INP | < 100ms |
| CLS | < 0.1 |
| TTFB | < 800ms (edge) |

Lighthouse targets: Performance > 90, Accessibility > 95, Best Practices >
95, SEO > 95.

## Monitoring (MVP)

- Vercel Analytics (free): page views + web vitals
- Stripe Dashboard: payment monitoring
- Printful Dashboard: order fulfillment tracking
- Resend dashboard: email delivery
- Errors logged via `console.error` (captured by Vercel)

## License

All rights reserved. This codebase is proprietary to Mediterranean Bear.