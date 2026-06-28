# NEXT STEPS

Execution steps to go from codebase to a live store. Complete in order. Each step
is self-contained -- finish it fully before moving on.

---

## 1. Create Accounts

If you already have accounts on these services, skip to step 2.

### 1.1 Neon (Postgres)

1. Go to https://neon.tech and sign up (free tier is sufficient).
2. Create a new project named `mediterranean-bear`.
3. Under **Connection Details**, copy the **pooled** connection string.
   - It looks like: `postgres://user:pass@ep-xxx-xxx.eu-west-1.aws.neon.tech/mediterranean-bear?sslmode=require`
   - Make sure it has `?sslmode=require` at the end.
   - Choose the region closest to Spain (e.g., `eu-west-1` Ireland or `eu-central-1` Frankfurt).

### 1.2 Stripe (test mode)

1. Go to https://dashboard.stripe.com/register and create an account.
2. From the Dashboard, toggle **View test data** to ON (top-right corner).
3. Copy the **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`) from **Developers -> API keys**.
4. Enable **Stripe Tax** under **Settings -> Tax -> Turn on Stripe Tax**. Set your default tax origin to `ES`.

### 1.3 Printful

1. Go to https://www.printful.com and sign up.
2. Create a **New Store** and connect it to your sales channel (or use the **Standalone store** option).
3. Go to **Stores -> Your Store -> API & Webhooks**.
4. Generate an **API key** under the API section. Copy it.
5. Leave the webhook section open -- you will fill it in step 5.

### 1.4 Resend

1. Go to https://resend.com and sign up (free tier: 100 emails/day, 3 domains).
2. Add a domain (see step 8 for domain setup) or use a test domain for dev.
3. Create an API key (`re_...`) under **API Keys**.
4. Verify your domain by adding the TXT record to DNS.

### 1.5 Vercel

1. Go to https://vercel.com and sign up with GitHub.
2. Install the Vercel app on your GitHub account.
3. (Done later in step 10 -- just have the account ready.)

---

## 2. Set Up `.env.local`

1. Copy the example file:

   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and fill in every value:

   | Variable | Where to get it | Example |
   |---|---|---|
   | `DATABASE_URL` | Neon dashboard (pooled connection string) | `postgres://user:pass@ep-xxx.eu-west-1.aws.neon.tech/mb?sslmode=require` |
   | `AUTH_SECRET` | Run `openssl rand -base64 32` | `u3CZpR3x7...` |
   | `AUTH_TRUST_HOST` | Set to `true` for Vercel | `true` |
   | `STRIPE_SECRET_KEY` | Stripe Dashboard -> Developers -> API keys (test mode) | `sk_test_...` |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard (test mode) | `pk_test_...` |
   | `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard -> Webhooks (set up in step 4) | `whsec_...` |
   | `PRINTFUL_API_KEY` | Printful Store -> API & Webhooks | (long hex string) |
   | `PRINTFUL_WEBHOOK_SECRET` | Choose a random string (shared with Printful in step 5) | `your-secret-here` |
   | `RESEND_API_KEY` | Resend Dashboard -> API Keys | `re_...` |
   | `EMAIL_FROM` | A verified domain on Resend | `Mediterranean Bear <hello@mediterraneanbear.com>` |
   | `EMAIL_FROM_DEV` | A verified domain on Resend (or same as above for now) | `Mediterranean Bear <dev@mediterraneanbear.com>` |
   | `ADMIN_EMAIL` | Your personal email for failure alerts | `admin@mediterraneanbear.com` |

   **Do not change:**
   - `NEXT_PUBLIC_SITE_URL` -- keep the dev URL for now
   - `NEXT_PUBLIC_SITE_NAME`
   - `DEFAULT_SHIPPING_FLAT_RATE_CENTS` (595 = 5.95 EUR)
   - `STRIPE_TAX_ENABLED` (true)
   - `BLOB_READ_WRITE_TOKEN` (optional, skip for MVP)

3. Verify the file is listed in `.gitignore` so it is never committed:

   ```bash
   grep ".env.local" .gitignore
   ```

---

## 3. Run Migrations

1. Install dependencies (if not already done):

   ```bash
   pnpm install
   ```

2. Generate the initial migration from the schema:

   ```bash
   pnpm db:generate
   ```

   This creates SQL files in `lib/db/migrations/`.

3. Apply the migration to Neon:

   ```bash
   pnpm db:migrate
   ```

   Expected output: `All migrations have been applied successfully`.

4. Verify the tables were created. Use Drizzle Studio:

   ```bash
   pnpm db:studio
   ```

   Or connect directly to Neon and run:

   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```

   Expected tables: `customers`, `categories`, `products`, `product_variants`,
   `product_images`, `carts`, `cart_items`, `orders`, `order_items`,
   `order_status_history`, `addresses`.

5. Start the dev server to verify:

   ```bash
   pnpm dev
   ```

   Open http://localhost:3000. The homepage should load with no errors.

---

## 4. Set Up Stripe Webhook

The Stripe webhook must be reachable from Stripe's servers. For local
development, you need the Stripe CLI to forward events.

### 4.1 Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
```

### 4.2 Log in

```bash
stripe login
```

Follow the browser prompt.

### 4.3 Start the webhook forwarder

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This outputs a webhook signing secret (`whsec_...`). Copy it into
`.env.local` as `STRIPE_WEBHOOK_SECRET`.

### 4.4 Start the dev server (separate terminal)

```bash
pnpm dev
```

### 4.5 Test by triggering a test event

```bash
stripe trigger checkout.session.completed
```

Check the terminal running `pnpm dev`. You should see:
```
[webhook/stripe] event type=checkout.session.completed, id=evt_...
```

### 4.6 (Production) Register the endpoint in Stripe Dashboard

For production, go to Stripe Dashboard -> **Developers -> Webhooks -> Add endpoint**:

- **Endpoint URL:** `https://<your-domain>/api/webhooks/stripe`
- **Events to subscribe to:**
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `charge.refunded`
  - `charge.dispute.created`
- Copy the generated `whsec_...` secret into the Vercel project env vars (step 10).

---

## 5. Set Up Printful Webhook

### 5.1 Configure the webhook in Printful

1. In Printful Dashboard, go to **Stores -> Your Store -> API & Webhooks**.
2. Under **Webhooks**, set:
   - **Payload URL:** `https://<your-domain>/api/webhooks/printful`
   - **Secret:** Enter the same string you set as `PRINTFUL_WEBHOOK_SECRET` in `.env.local`
3. **Subscribe to these events:**
   - `order.created`
   - `order.in_progress`
   - `order.on_hold`
   - `order.canceled`
   - `order.fulfilled`
   - `package.shipped`
   - `package.returned`

### 5.2 Test locally with ngrok (optional)

If you need to test Printful webhooks locally before deploying:

```bash
brew install ngrok
ngrok http 3000
```

Use the generated `https://xxxx.ngrok.io` URL as the Payload URL in Printful.

### 5.3 Verify signature verification

The webhook handler (`app/api/webhooks/printful/route.ts`) verifies every
request using `crypto.timingSafeEqual` with the `X-PF-Signature` header and
your `PRINTFUL_WEBHOOK_SECRET`. No further configuration is needed.

---

## 6. Sync Products from Printful

1. With the dev server running, call the sync endpoint:

   ```bash
   curl -X POST http://localhost:3000/api/products/sync
   ```

2. Expected response:

   ```json
   { "synced": 9, "skipped": 0, "errors": [] }
   ```

   This syncs our 9 known store products into the `products`, `product_variants`,
   and `product_images` tables.

3. If any products fail to sync, check the error messages. Common issues:
   - Printful API key is wrong or expired.
   - The store is empty or in sandbox mode -- add test products first.

4. Verify in the browser: go to http://localhost:3000/products.
   You should see 9 products with names, prices, and images.

5. Click into a product detail page. Verify:
   - Color swatches render (if the product has color variants).
   - Size/option buttons render.
   - Price updates when you toggle variants.
   - "Add to Cart" button is present.

6. (Re-sync safety) Running the sync again is idempotent -- it upserts by
   `printful_id` and skips unchanged records.

---

## 7. Test End-to-End Locally

Run through the full customer flow manually:

### 7.1 Registration

1. Go to http://localhost:3000/sign-up.
2. Create an account with email + password.
3. Verify: you are redirected to `/account` with your email displayed.

### 7.2 Browse and Add to Cart

1. Go to http://localhost:3000/products.
2. Filter by category ("t-shirts").
3. Click a product. Select a color + size.
4. Click **Add to Cart**. Verify:
   - Cart badge in the header updates.
   - Cart drawer slides open with the item.
   - Item shows correct variant name, price, and quantity.
5. Add a second product. Verify both items appear.

### 7.3 Cart

1. Open the cart drawer or go to http://localhost:3000/cart.
2. Increase the quantity of one item. Verify the subtotal updates.
3. Remove an item. Verify it disappears and the total recalculates.
4. Check that the cart persists across page refresh (Zustand persist).

### 7.4 Checkout

1. Click **Checkout**. Verify you are prompted to sign in (if not already).
2. You should land on http://localhost:3000/checkout.
3. Fill in the shipping address:
   - Street: `Carrer de l'Om 10`
   - City: `Palma`
   - Postal code: `07001`
   - Country: Spain (pre-selected)
4. Verify shipping options appear (Printful live quote or flat rate fallback).
5. Click **Pay with Stripe**.

### 7.5 Stripe Checkout

1. Stripe Checkout opens (hosted page).
2. Use the test card: `4242 4242 4242 4242` with any future expiry and any CVC.
3. Complete the payment.
4. Verify: you are redirected to `/order/<id>/confirmation`.

### 7.6 Verify Order in DB

1. Check the `orders` table:
   ```sql
   SELECT id, order_number, status, total_cents FROM orders;
   ```
   Expected: 1 row, status `submitted`, order_number `MB-000001`.

2. Check `order_items`, `order_status_history`, `addresses` all have data.

### 7.7 Admin Dashboard

1. Go to http://localhost:3000/admin.
2. You need an admin user. Promote your user:

   ```sql
   UPDATE customers SET role = 'admin' WHERE email = '<your-email>';
   ```

3. Verify the admin dashboard shows:
   - Order count (1)
   - Revenue total
   - Recent orders list
4. Click the order. You should see order details, items, and status history.
5. Verify the **Cancel** and **Retry fulfillment** buttons are present.

---

## 8. Domains

### 8.1 Dev Domain

`mediterraneanbear.marctonimas.com` should already point to Vercel via a CNAME
record on `marctonimas.com` DNS:
```
mediterraneanbear.marctonimas.com  CNAME  cname.vercel-dns.com
```

Wait for DNS propagation (up to 24h but usually ~5 min).

### 8.2 Production Domain

1. Purchase `mediterraneanbear.com` from a domain registrar (e.g.,
   Namecheap, Cloudflare, or buy through Vercel).
2. In Vercel Dashboard -> your project -> **Settings -> Domains**:
   Add `mediterraneanbear.com`.
3. Follow Vercel's instructions to configure DNS (typically a CNAME or A record):
   ```
   mediterraneanbear.com  CNAME  cname.vercel-dns.com
   ```
4. Wait for SSL certificate provisioning (Vercel does this automatically),
   usually ~5 minutes.

### 8.3 Resend Domain Verification

1. In Resend Dashboard -> **Domains** -> **Add Domain**.
2. Enter `mediterraneanbear.com`.
3. Add the provided TXT record to your DNS:
   ```
   resend._domainkey.mediterraneanbear.com  TXT  "resend=..."
   ```
4. Wait for DKIM verification (usually ~1 min). Status goes from `pending` to `verified`.

---

## 9. Deploy to Vercel

### 9.1 Push to GitHub

1. Create a GitHub repo:

   ```bash
   gh repo create mediterranean-bear --private
   ```

2. Push the code:

   ```bash
   git remote add origin git@github.com:<your-org>/mediterranean-bear.git
   git push -u origin main
   ```

### 9.2 Import in Vercel

1. Go to https://vercel.com/new.
2. Select the `mediterranean-bear` repo.
3. **Framework preset:** Next.js (auto-detected).
4. **Root directory:** `./` (default).
5. **Build command:** `pnpm build` (auto-detected from package.json).
6. **Output directory:** `.next` (default).

### 9.3 Set Environment Variables in Vercel

In Vercel -> Project -> **Settings -> Environment Variables**, add every
variable from `.env.example`:

| Variable | Production value | Preview value |
|---|---|---|
| `DATABASE_URL` | Production Neon DB URL | Same Neon DB or a Neon branch |
| `AUTH_SECRET` | `openssl rand -base64 32` (new, NOT same as local) | Same or different |
| `AUTH_TRUST_HOST` | `true` | `true` |
| `STRIPE_SECRET_KEY` | Live `sk_live_...` | Test `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live `pk_live_...` | Test `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Live Stripe webhook secret | Test webhook secret |
| `PRINTFUL_API_KEY` | Printful API key | Same (Printful has no separate test mode) |
| `PRINTFUL_WEBHOOK_SECRET` | Same as configured in Printful webhook | Same |
| `RESEND_API_KEY` | Resend API key | Resend API key |
| `EMAIL_FROM` | `Mediterranean Bear <hello@mediterraneanbear.com>` | Same |
| `EMAIL_FROM_DEV` | Same as EMAIL_FROM | `dev@mediterraneanbear.com` |
| `ADMIN_EMAIL` | Your email for alerts | Your email |
| `DEFAULT_SHIPPING_FLAT_RATE_CENTS` | `595` | `595` |
| `STRIPE_TAX_ENABLED` | `true` | `true` |
| `NEXT_PUBLIC_SITE_URL` | `https://mediterraneanbear.com` | `https://mediterraneanbear.marctonimas.com` |
| `NEXT_PUBLIC_SITE_NAME` | `Mediterranean Bear` | `Mediterranean Bear` |

### 9.4 Region

The `vercel.json` file already pins the Frankfurt region:

```json
{
  "framework": "nextjs",
  "regions": ["fra1"]
}
```

No additional region configuration is needed.

### 9.5 First Deploy

1. Click **Deploy** in Vercel.
2. Wait for the build to complete (~3 min).
3. Vercel assigns a `*.vercel.app` URL. Visit it.

### 9.6 Run Migrations on Production DB

If using a separate production Neon database (recommended), run migrations:

```bash
DATABASE_URL="<production-neon-url>" pnpm db:migrate
```

Or use Vercel's Post-Deploy Hook (under **Settings -> Git -> Deployment Hooks**)
with a serverless migration runner (or run manually after deploy).

### 9.7 Sync Products on Production

```bash
curl -X POST https://<your-domain>/api/products/sync
```

---

## 10. Post-Deploy Verification

### 10.1 Smoke Tests

Go through the full flow on the deployed site:

- [ ] Homepage loads without console errors
- [ ] `/products` shows the product grid with images
- [ ] Product detail page loads, variant selector works
- [ ] Cart works (add items, update quantities, remove)
- [ ] Sign-up creates an account
- [ ] Sign-in works
- [ ] Account dashboard shows user info
- [ ] Checkout loads, shipping address form works
- [ ] Stripe Checkout redirect works (test mode card)
- [ ] Redirect back to confirmation page
- [ ] Admin dashboard loads (after promoting user)
- [ ] `/sitemap.xml` returns valid XML with product entries
- [ ] `/robots.txt` returns valid text with disallow rules
- [ ] OG tags render correctly (use https://opengraph.dev or the browser inspector)

### 10.2 Stripe Webhook Test

1. Go to Stripe Dashboard -> **Developers -> Webhooks**.
2. Find your endpoint, click **Send test webhook**.
3. Select `checkout.session.completed`.
4. Check the Vercel logs for the webhook handler response (should be 200 OK).

### 10.3 Search Engines

1. In Google Search Console, add your domain (https://mediterraneanbear.com).
2. Submit the sitemap URL: `https://mediterraneanbear.com/sitemap.xml`.
3. Monitor the index status over the next few days.

---

## 11. Go Live (Production Mode)

### 11.1 Switch Stripe to Live Mode

1. In Stripe Dashboard, turn **View test data** OFF.
2. Copy the live publishable key (`pk_live_...`) and secret key (`sk_live_...`).
3. Update the Vercel env vars.
4. Create a live webhook endpoint for `https://mediterraneanbear.com/api/webhooks/stripe`.

### 11.2 Update Printful Webhook URL

1. In Printful Dashboard, update the webhook Payload URL to:
   `https://mediterraneanbear.com/api/webhooks/printful`.

### 11.3 Update NEXT_PUBLIC_SITE_URL

In Vercel, change `NEXT_PUBLIC_SITE_URL` to `https://mediterraneanbear.com`.
Redeploy.

### 11.4 Last Checks

- [ ] Try a real purchase with your own credit card (Stripe live test: use
      your card, then refund immediately).
- [ ] Verify you receive the order confirmation email.
- [ ] Wait for Printful to process the order (may take a few hours for the
      first one).
- [ ] Verify the `package.shipped` webhook arrives and you receive the
      shipping confirmation email.

### 11.5 Monitoring

- Add Vercel Analytics on the Vercel Dashboard to track page views and Core Web Vitals.
- Optional: add a `console.error` capture service like Sentry (free tier) if
  you want error monitoring.

---

## 12. Longer-Term (Post-MVP)

Things to consider after launch:

- [ ] Google OAuth sign-in (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) -- already in
      `.env.example` as commented-out placeholders.
- [ ] Analytics (Plausible, Umami, or Google Analytics).
- [ ] Blog / content pages for SEO.
- [ ] Discount / coupon system in Stripe (promotion codes).
- [ ] Wishlist feature.
- [ ] Product reviews.
- [ ] Shipping to more EU countries (update `allowed_countries` in Stripe
      checkout + shipping quote logic).
- [ ] Error monitoring (Sentry).
- [ ] Performance budget CI check (Lighthouse CI).
