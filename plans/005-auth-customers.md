# 005 -- Auth & Customers

## Approach

**Auth.js v5** (formerly NextAuth.js) -- free, open-source, built for Next.js App Router. Provides:
- Email/password (credentials)
- Google OAuth
- GitHub OAuth (optional)
- Session management via JWT (no server-side store needed)

## Auth.js Configuration

File: `lib/auth.ts`

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({ clientId, clientSecret }),
    CredentialsProvider({ ... })
  ],
  callbacks: {
    session({ session, token }) {
      // Attach our internal customer ID to session
      session.user.customerId = token.customerId
      return session
    },
    signIn({ user }) {
      // Sync Auth.js user with our customers table
      // upsertCustomer(user)
      return true
    }
  }
})
```

## Customer Sync

When a user signs up or logs in (via any provider), sync them to our `customers` table:

1. Auth.js `signIn` callback fires
2. Check if customer exists by `auth_user_id` (from Auth.js user.id) or email
3. If not, create new customer record
4. If exists, update name/avatar
5. Attach `customerId` to JWT token for API route use

## Guest Checkout

Not all customers need to create an account. Guest checkout flow:
1. Customer adds items to cart
2. Proceeds to checkout -> enters email address
3. Stripe Checkout Session created with `customer_email`
4. On payment, order is created. We create a minimal customer record if email is new
5. Order confirmation page shows order details
6. Email confirmation sent with order link

Guest customers can later create an account using the same email -> we link past orders to their new account.

## Auth-Protected Routes

| Route | Description |
|---|---|
| `/account` | Dashboard (recent orders, profile) |
| `/account/orders` | Order history |
| `/account/orders/[id]` | Single order detail |
| `/account/addresses` | Saved shipping addresses |
| `/account/settings` | Name, email, avatar |

## API Security

- API routes that need auth: check `auth()` function
- Admin routes check for admin role in JWT
- Order routes check `customer_id` matches order's customer
- Webhook routes are public but signature-verified

## Environment Variables

```
AUTH_SECRET=<openssl rand -base64 32>
AUTH_GOOGLE_ID=<google oauth client id>
AUTH_GOOGLE_SECRET=<google oauth client secret>
```

## Pages

| Route | File | Notes |
|---|---|---|
| `/sign-in` | `app/(auth)/sign-in/page.tsx` | Login form |
| `/sign-up` | `app/(auth)/sign-up/page.tsx` | Registration form |
| `/account` | `app/(auth)/account/page.tsx` | Dashboard |
| `/account/orders` | `app/(auth)/account/orders/page.tsx` | Order list |
| `/account/orders/[id]` | `app/(auth)/account/orders/[id]/page.tsx` | Order detail |

## MVP Scope

For MVP, we start with:
- Email/password auth via Auth.js CredentialsProvider
- Guest checkout (email at checkout, no password)
- Order lookup by email + order ID for guest customers
- Customer creation on first purchase

Account creation with Google OAuth and full order history is Phase 3.
