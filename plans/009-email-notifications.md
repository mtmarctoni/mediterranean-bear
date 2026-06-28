# 009 -- Email Notifications

## Approach

**Resend** + **React Email** for transactional emails.
- Resend free tier: 100 emails/day (more than enough for MVP)
- React Email: build email templates as React components
- Send via Resend API from our server-side code

## Setup

```
RESEND_API_KEY=re_...
EMAIL_FROM=Mediterranean Bear <hello@mediterraneanbear.com>
EMAIL_FROM_DEV=Mediterranean Bear <dev@mediterraneanbear.com>
```

## Email Templates

Built with React Email (`.tsx` files in `emails/`):

### Order Confirmation (customer)
Trigger: Payment confirmed
- Thank you message
- Order number
- Item list with mockup images
- Shipping address
- Estimated delivery (2-7 business days)
- Order tracking link
- CTA: "View Order"

### Shipping Confirmation (customer)
Trigger: Printful `package.shipped` webhook
- Your order has shipped!
- Tracking number (linked to carrier)
- Items in this package
- Estimated delivery date
- CTA: "Track Package"

### Order Cancelled (customer)
Trigger: Order cancelled
- Sorry message
- Refund info (if applicable)
- Items that were cancelled

### Admin Notification (admin)
Trigger: Failed Printful submission only (not every order)
- Order ID
- Error details from Printful
- Customer email
- Items ordered
- Total
- Link to admin order page
- Action needed: retry, refund, or contact customer

Note: New order notifications are NOT emailed for MVP -- the admin dashboard and Stripe dashboard provide sufficient visibility. This reduces email noise. Daily digest can be added later if desired.

### Failed Printful Submission (admin)
Trigger: Printful API error on order submit
- Order ID
- Error details
- Manual action needed

## Email Sending

```typescript
// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOrderConfirmation(order: Order) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [order.email],
    subject: `Order Confirmed! #${order.orderNumber}`,
    react: OrderConfirmationEmail({ order }),
  })
}
```

## Sending Triggers

| Event | Email | Trigger Location |
|---|---|---|
| Payment confirmed | Order confirmation | `api/webhooks/stripe` |
| Printful shipped | Shipping confirmation | `api/webhooks/printful` |
| Order cancelled | Cancellation notice | Admin API action |
| Printful error | Admin error alert | `lib/printful.ts` error handler |

## Design

- Branded with logo, brand colors
- Responsive (works on mobile)
- Plain text fallback
- Unsubscribe link (footer)
- Transactional only (no marketing emails for MVP)
