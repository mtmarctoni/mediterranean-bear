# 011 -- Design System

## Approach

- **Tailwind CSS v4** for all styling (utility-first, rapid iteration)
- **shadcn/ui** for base components (button, card, input, modal, etc.)
- Custom theme via Tailwind v4's `@theme` directive in CSS (no `tailwind.config.ts` -- v4 uses CSS-based config)
- Mobile-first responsive design

## Brand Identity

Mediterranean-inspired, drawing from Mallorca: Tramuntana mountains, Mediterranean sea, warm sunsets, terracotta earth. The palette uses semantic token names so colors can be swapped in one place (`globals.css`) without touching component code.

### Token Architecture

Two layers of tokens:
1. **Semantic tokens** -- what components reference (`primary`, `secondary`, `accent`, `background`, `surface`, `text`, `text-muted`, `border`, `success`, `warning`, `danger`). These rarely change.
2. **Raw color values** -- the actual hex values assigned to semantic tokens. Change these to retheme the entire site.

| Token | Value (Mediterranean) | Usage |
|---|---|---|
| `primary` | `#2d5a4f` (Mediterranean pine) | Headers, buttons, links, brand |
| `primary-hover` | `#1f4039` | Hover/active states for primary |
| `secondary` | `#c97b5a` (terracotta) | Secondary buttons, badges |
| `secondary-hover` | `#b5674a` | Hover/active states for secondary |
| `accent` | `#e0a44a` (Mallorca sunset gold) | CTAs, highlights, sale badges |
| `accent-hover` | `#c98e3a` | Hover/active states for accent |
| `background` | `#faf8f3` (warm sand white) | Page background |
| `surface` | `#ffffff` | Cards, modals, inputs |
| `surface-muted` | `#f3efe8` | Subtle backgrounds, table stripes |
| `text` | `#1a1a1a` | Body text |
| `text-muted` | `#6b7280` | Secondary text, captions |
| `border` | `#e5e0d8` | Borders, dividers |
| `success` | `#3a7d44` | Success states |
| `warning` | `#d97706` | Warning states |
| `danger` | `#c0392b` | Error/destructive states |

Typography:
- Headings: Inter (or system font fallback)
- Body: Inter (or system font fallback)
- Monospace: For code, not used in marketing pages

## Tailwind v4 Theme (CSS-based config)

Tailwind v4 replaces `tailwind.config.ts` with CSS-first configuration using `@theme`. All semantic tokens are defined here -- change a value and it propagates everywhere.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Brand colors -- change these to retheme the entire site */
  --color-primary: #2d5a4f;
  --color-primary-hover: #1f4039;
  --color-secondary: #c97b5a;
  --color-secondary-hover: #b5674a;
  --color-accent: #e0a44a;
  --color-accent-hover: #c98e3a;

  /* Surfaces */
  --color-background: #faf8f3;
  --color-surface: #ffffff;
  --color-surface-muted: #f3efe8;

  /* Text */
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;

  /* Borders & status */
  --color-border: #e5e0d8;
  --color-success: #3a7d44;
  --color-warning: #d97706;
  --color-danger: #c0392b;

  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
}
```

Usage in components: `bg-primary`, `text-accent`, `border-border`, `text-text-muted`, etc. To retheme, change only the hex values in `@theme` -- no component edits needed.

### shadcn/ui integration

shadcn/ui uses CSS variables for its theming. Map the semantic tokens to shadcn's variable names so shadcn components automatically use our palette:

```css
:root {
  --background: var(--color-background);
  --foreground: var(--color-text);
  --card: var(--color-surface);
  --card-foreground: var(--color-text);
  --primary: var(--color-primary);
  --primary-foreground: #ffffff;
  --secondary: var(--color-secondary);
  --secondary-foreground: #ffffff;
  --muted: var(--color-surface-muted);
  --muted-foreground: var(--color-text-muted);
  --accent: var(--color-accent);
  --accent-foreground: var(--color-text);
  --destructive: var(--color-danger);
  --border: var(--color-border);
  --input: var(--color-border);
  --ring: var(--color-primary);
}
```

## Page Templates

### Homepage
- Hero section (full-width image/graphic + tagline + CTA)
- Featured products grid (2-3 rows)
- Category links
- About blurb / brand story

### Product Listing
- Grid of product cards (2 cols mobile, 3-4 cols desktop)
- Filter/sort controls (category, price sort)
- Each card: mockup image, name, price, color count

### Product Detail
- Image gallery (main mockup + thumbnails)
- Product info: name, description, price
- Variant selectors: color (circles), size (buttons)
- Add to cart button (sticky on mobile)
- Size guide link
- Product details / care instructions

### Cart
- Slide-over drawer + full page
- Line items with thumbnail, details, qty, remove

### Checkout
- Stripe hosted page (redirect)

### Order Confirmation
- Success state with order details
- Clean, minimal layout

### Account
- Dashboard with recent orders
- Order history table
- Address management

### Admin
- Data tables (orders, products)
- Action buttons with confirmation dialogs

## shadcn/ui Components to Use

| Component | Where |
|---|---|
| Button | Everywhere (primary, secondary, ghost variants) |
| Card | Product cards, order cards |
| Input | Forms |
| Select | Dropdowns (size selector, sort) |
| Sheet | Cart drawer |
| Dialog | Size guide modal, confirmations |
| Badge | Status indicators (order status) |
| Table | Order history, admin |
| Tabs | Product detail (info/sizing) |
| Separator | Section dividers |
| Skeleton | Loading states |
| Toast | Notifications (cart added, error) |

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 640px | Single column, stacked |
| Tablet | 640-1024px | 2-3 column grid |
| Desktop | > 1024px | 3-4 column grid |

## Loading States

- Product pages: skeleton cards while ISR builds
- Cart: spinner on checkout action
- Images: blur placeholder while loading (next/image blurDataURL)
- Transitions: subtle opacity transitions on page changes

## Accessibility

- All interactive elements keyboard-navigable
- Focus ring styles on all inputs/buttons
- Alt text on all product images
- ARIA labels on icon-only buttons
- Color contrast meets WCAG AA minimum
- Form error messages associated with inputs
