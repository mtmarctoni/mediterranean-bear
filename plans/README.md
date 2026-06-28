# Mediterranean Bear -- Planning Documents

Blueprint for a custom ecommerce engine selling t-shirts via Printful (print-on-demand) and Stripe (payments). Built with Next.js, zero monthly platform fees.

## Document Index

### Foundation
| Doc | Title | Status |
|---|---|---|
| [000](000-architecture-overview.md) | Architecture Overview | Done |
| [011](011-design-system.md) | Design System | Done |
| [001](001-database-schema.md) | Database Schema | Done |

### Core Loop (Browse & Basket)
| Doc | Title | Status |
|---|---|---|
| [002](002-product-catalog.md) | Product Catalog | Done |
| [006](006-cart-state.md) | Cart State | Done |

### Transaction & Fulfillment
| Doc | Title | Status |
|---|---|---|
| [005](005-auth-customers.md) | Auth & Customers | Done |
| [013](013-shipping-taxes.md) | Dynamic Shipping & Taxes | Done |
| [003](003-stripe-payments.md) | Stripe Payments | Done |
| [004](004-printful-fulfillment.md) | Printful Fulfillment | Done |
| [012](012-webhooks.md) | Webhooks (The Glue) | Done |
| [007](007-order-lifecycle-admin.md) | Order Lifecycle & Admin | Done |

### Polish & Launch
| Doc | Title | Status |
|---|---|---|
| [009](009-email-notifications.md) | Email Notifications | Done |
| [008](008-seo-performance.md) | SEO & Performance | Done |
| [010](010-deployment.md) | Deployment | Done |

## Suggested Build Order

### Phase 1: Foundation
1. **000** -- Architecture overview (understand the system)
2. **011** -- Design system (know your UI components before building)
3. **001** -- Database schema (data models supporting everything)

### Phase 2: Core Loop (Browse & Basket)
4. **002** -- Product catalog (fetching & displaying products)
5. **006** -- Cart state (adding to basket, local totals)

### Phase 3: Transaction & Fulfillment (The Hard Part)
6. **005** -- Auth & customers (account vs guest checkout)
7. **013** -- Shipping & taxes (live rates before payment)
8. **003** -- Stripe payments (taking the money)
9. **004** -- Printful fulfillment (passing order to Printful)
10. **012** -- Webhooks (the glue: Stripe + Printful async events)
11. **007** -- Order lifecycle & admin (status management, failed fulfillment)

### Phase 4: Polish & Launch
12. **009** -- Email notifications (transactional emails)
13. **008** -- SEO & performance (speed and Google)
14. **010** -- Deployment (going live)

## Tech Stack Summary

| Layer | Tool | Cost |
|---|---|---|
| Framework | Next.js 16 (App Router) | Free |
| UI | Tailwind v4 + shadcn/ui | Free |
| Database | Neon Postgres | Free (500MB) |
| ORM | Drizzle | Free |
| Auth | Auth.js v5 | Free |
| Payments | Stripe | ~2.9% + $0.30/txn |
| Tax | Stripe Tax | $0.50/txn |
| Fulfillment | Printful API v2 | Per-product (~$10-15/shirt) |
| Email | Resend | Free (100/day) |
| File storage | Vercel Blob | Free tier |
| Hosting | Vercel | Free (Hobby) |
| Domain | Namecheap/Cloudflare | ~$10/yr |
| Package manager | pnpm (required) | Free |

**Total monthly fixed cost: ~$0.83 (domain only)**
