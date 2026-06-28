# 007 -- Order Lifecycle & Admin

## Order States

```
pending_payment
      |
      v (Stripe webhook)
confirmed
      |
      v (API call to Printful)
submitted
      |
      v (Printful webhook: order.in_progress)
in_progress
      |
      v (Printful webhook: package.shipped)
shipped <--> partially_shipped (multi-package)
      |
      v (inferred after tracking shows delivered)
delivered
```

Failure states:
```
confirmed -> failed (Printful rejected the order)
submitted -> on_hold (Printful flagged issue)
any state -> cancelled (admin action or Printful cancellation)
confirmed -> cancelled (session expired / payment refunded before fulfillment)
any state -> refunded (money returned to customer via Stripe)
```

**`cancelled` vs `refunded`:**
- `cancelled`: Order voided, no fulfillment attempted or completed. May or may not involve a refund (e.g., session expired = no charge to refund).
- `refunded`: Money was charged and has been returned to the customer via Stripe. The order may have been produced or shipped -- the refund is a financial action, not a fulfillment one. An order can be both `shipped` and `refunded` (e.g., post-delivery return).

## Status History

Every status transition is logged in `order_status_history`. This provides:
- Audit trail for customer support
- Debugging for failed orders
- Timeline visible to customer on order page

## Customer-Facing Order Page

Route: `/order/[id]`

Shows:
- Order confirmation number (short, human-readable)
- Order status with progress bar
- List of items ordered (with mockup thumbnails)
- Shipping address
- Order total
- Estimated delivery dates
- Tracking links (once shipped)
- Timeline of status changes

Guest customers access this via link in confirmation email. Authenticated customers find it in `/account/orders`.

## Confirmation Page

Route: `/order/[id]/confirmation`

Shown after successful payment:
- Thank you message
- Order number
- Items ordered
- Shipping address
- Estimated delivery (Printful: 2-7 business days)
- Email confirmation notice
- "Continue shopping" button

## Admin Dashboard

Route: `/admin`

Simple admin panel (no heavy framework, built with shadcn table components):

### Orders View
- Filterable table of all orders
- Columns: order ID, customer email, status, total, date
- Click to see order details
- Actions: cancel order, retry Printful submission, mark as refunded

### Products View
- List of products with active/inactive toggle
- Quick stats: how many sold
- Ability to add new products (future)

## Order Number Format

Internal: UUID (v4)
Human-readable: `MB-XXXXXX` (6 random alphanumeric chars, stored separately or derived)

## Admin Auth

- Simple role check on the `customers` table: `role` column ('customer' | 'admin')
- Admin routes check `auth().user.role === 'admin'`
- For MVP, set admin role manually in the database
- Admin pages are routes under `/admin`, protected by middleware

## Failed Fulfillment Handling

The most dangerous state: **customer paid, but Printful rejected the order.** This happens when:
- Address validation fails (bad zip, undeliverable)
- Product variant goes out of stock
- Print file is rejected (wrong resolution, format)
- Printful API is down or returns an error
- Rate limit hit and retries exhausted

### State: `confirmed` -> `failed`

When Printful submission fails:
1. Order status set to `failed`
2. `order_status_history` row created with error details
3. Admin alert email sent immediately (see 009)
4. Order appears in admin dashboard with red "Failed" badge
5. Customer is NOT notified yet (we don't want to panic them)

### Admin Recovery Actions

On the failed order detail page, admin sees:
- The exact error from Printful
- The customer's shipping address (to spot issues)
- Action buttons:
  - **Edit Address & Retry** -- fix the address, resubmit to Printful
  - **Contact Customer** -- open mailto with prefilled message asking to verify address
  - **Refund** -- if the issue can't be resolved, refund via Stripe
  - **Mark Resolved** -- if resolved outside the system (e.g., placed order manually in Printful dashboard)

### Retry Logic

```typescript
async function retryPrintfulSubmission(orderId: string) {
  const order = await getOrder(orderId)
  if (order.status !== 'failed' && order.status !== 'confirmed') {
    throw new Error('Can only retry failed or confirmed orders')
  }
  try {
    const printfulOrder = await printful.createOrder(buildPrintfulPayload(order))
    await updateOrder(orderId, {
      status: 'submitted',
      printful_order_id: printfulOrder.id,
    })
  } catch (error) {
    await updateOrder(orderId, { status: 'failed' })
    await logOrderHistory(orderId, 'failed', error.message)
    throw error
  }
}
```

### Automatic Retries (Optional Enhancement)

For transient failures (Printful API down, rate limit), implement a background retry queue:
- Attempt 1: immediately
- Attempt 2: +5 minutes
- Attempt 3: +30 minutes
- Attempt 4: +2 hours
- After 4 failures: mark as `failed`, alert admin

Use Vercel's cron jobs or a simple queue table polled by a scheduled function.

### The "Money Already Collected" Rule

If an order is `failed` for more than 48 hours and admin hasn't resolved it, **automatically refund the customer**. Holding customer money without delivering is a legal risk and a support nightmare. The admin gets a warning email at 24 hours.

### Out-of-Stock Scenario

If a product variant goes out of stock after the customer paid:
1. Printful rejects the order
2. Admin sees "out of stock" error
3. Options:
   - Wait for restock (Printful usually restocks within days) and retry
   - Refund the customer
   - Offer an alternative product (manual, via email)
4. Mark the product variant as `inactive` in our DB to prevent new orders

## Refund Flow

1. Admin clicks "Refund" on order detail page
2. Confirmation dialog: "This will refund $X to the customer. Continue?"
3. API calls Stripe to process refund (`stripe.refunds.create`)
4. On Stripe `charge.refunded` webhook -> update order status to `refunded`
5. Email customer: refund confirmation
6. Note: If Printful already produced the item, the cost is sunk. Refund policy options:
   - **Full refund, eat the cost** (best for customer trust, worst for margin)
   - **No refund if already printed** (state this in your returns policy upfront)
   - **Partial refund** (compromise)
   Recommended: full refund if order hasn't shipped yet; no refund if shipped (customer can return at their cost).
