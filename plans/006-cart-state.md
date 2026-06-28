# 006 -- Cart State

## Architecture

Two-layer cart system:

1. **Client layer** -- Zustand store for instant UI updates (add/remove without network)
2. **Server layer** -- PostgreSQL-backed cart for persistence across sessions/devices

## Client State (Zustand)

```typescript
interface CartStore {
  items: CartItem[]
  isOpen: boolean       // cart drawer visibility

  // Computed
  itemCount: number
  subtotal: number

  // Actions
  addItem(productVariantId, quantity): void
  removeItem(productVariantId): void
  updateQuantity(productVariantId, quantity): void
  clearCart(): void
  openCart(): void
  closeCart(): void
}
```

On mount, Zustand hydrates from localStorage for instant load. On change, it syncs to the server API.

## Server Persistence

**Anonymous carts:** Identified by a `session_token` stored in a cookie.

```
Cookie: cart_token=<uuid>
```

The `session_token` is generated on first visit and stored in `cart_sessions` table. Cart items are stored in `cart_items` table.

**Authenticated carts:** Linked to the customer's ID. On login, merge anonymous cart into authenticated cart.

## Cart Sync Strategy

| Action | Client | Server |
|---|---|---|
| Add item | Update Zustand immediately | Debounced PUT /api/cart |
| Remove item | Update Zustand immediately | Immediate DELETE |
| Update qty | Update Zustand immediately | Debounced PATCH |
| Load page | Hydrate from localStorage | Fetch from API if available |

Debounce server sync by 500ms to avoid excessive API calls.

## Cart Drawer (UI)

A slide-over panel that opens from the right side:
- List of cart items with thumbnail, name, size, color, quantity, price
- Quantity adjuster (+/- buttons)
- Remove button
- Subtotal display
- "Checkout" button
- "Continue shopping" link
- Empty state with "Start shopping" CTA

## Cart Page (/cart)

Full-page cart for when the customer wants a detailed view:
- Same items as drawer but with more space
- Size/color readout
- Estimated shipping note
- "Proceed to checkout" button
- "Continue shopping" link

## API Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/cart` | Get current cart |
| POST | `/api/cart/items` | Add item to cart |
| PATCH | `/api/cart/items` | Update item quantity |
| DELETE | `/api/cart/items/[variantId]` | Remove item |
| POST | `/api/cart/merge` | Merge anonymous->authenticated on login |

## Cart on Login

When a guest user logs in:
1. Fetch anonymous cart from `cart_sessions` by cookie token
2. Fetch authenticated cart by `customer_id`
3. Merge: for each anonymous item, add to authenticated cart (sum quantities if same variant)
4. Delete anonymous cart session
5. Update cookie

## Cart Expiry

- Anonymous carts expire after 30 days (cleanup via Neon cron or manual job)
- Authenticated carts persist indefinitely
- Cart items for deleted/unavailable products are automatically removed on fetch
