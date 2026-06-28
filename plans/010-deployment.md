# 010 -- Deployment

## Platform

**Vercel** (free Hobby tier):
- Automatic deploys from GitHub
- Serverless functions for API routes
- Edge network for static assets
- Custom domain with SSL
- Preview deployments for branches

## Git Workflow

```
main         -- production (auto-deploys to vercel)
  +-- dev    -- development (preview deploy)
       +-- feature/xxx  -- feature branches (preview deploy)
```

## Environment Variables (Vercel)

Set in Vercel project settings (not in code):

```
# App
NEXT_PUBLIC_SITE_URL=https://mediterraneanbear.marctonimas.com
NEXT_PUBLIC_SITE_NAME=Mediterranean Bear

# Database
DATABASE_URL=postgres://...

# Auth
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Printful
PRINTFUL_API_KEY=...
PRINTFUL_STORE_ID=...
PRINTFUL_WEBHOOK_SECRET=...

# Resend
RESEND_API_KEY=re_...

# Vercel Blob
BLOB_READ_WRITE_TOKEN=...
```

## Domain Setup

**Development phase:** `mediterraneanbear.marctonimas.com` (subdomain)
**Production (when ready):** `mediterraneanbear.com`

1. Development: Add CNAME record for `mediterraneanbear` pointing to Vercel on `marctonimas.com` DNS
2. Production: Purchase `mediterraneanbear.com` on Namecheap/Cloudflare
3. In Vercel dashboard: Project -> Settings -> Domains -> Add both domains
4. Vercel provisions SSL automatically for both
5. Update `NEXT_PUBLIC_SITE_URL` env var when switching to production domain

## Stripe Webhook Configuration

1. Stripe Dashboard -> Developers -> Webhooks
2. Add endpoint: `https://mediterraneanbear.com/api/webhooks/stripe`
3. Subscribe to events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `charge.refunded`
4. Copy signing secret -> `STRIPE_WEBHOOK_SECRET`

## Printful Webhook Configuration

1. Printful Dashboard -> Stores -> Your Store -> API & Webhooks
2. Set webhook URL: `https://mediterraneanbear.com/api/webhooks/printful`
3. Subscribe to events:
   - `order.created`
   - `order.in_progress`
   - `order.on_hold`
   - `order.canceled`
   - `order.fulfilled`
   - `package.shipped`
4. Copy any shared secret if provided

## CI/CD

Vercel auto-deploys on push to `main` and `dev`. Preview deployments for PRs.

No custom CI needed for MVP -- Vercel handles it.

## Database Migrations

Run before deploy:
```bash
pnpm db:migrate   # Apply pending migrations
```

Can be automated via Vercel Post-Deploy Hook or a simple GitHub Action.

## Monitoring (MVP)

- Vercel Analytics (free): page views, web vitals
- Stripe Dashboard: payment monitoring
- Printful Dashboard: order fulfillment tracking
- Basic error logging via `console.error` (Vercel captures these)

## Rollback

Vercel: `vercel rollback` or promote a previous deployment in the Vercel dashboard.

Database: Neon branching allows instant branch restore. Schema changes should be backward-compatible.
