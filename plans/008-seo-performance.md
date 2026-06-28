# 008 -- SEO & Performance

## SEO Strategy

### Target Keywords (MVP)

Brand + location focused, bilingual (EN/ES since we ship to Spain):

| Keyword | Language | Intent |
|---|---|---|
| Mediterranean Bear | EN | Brand search |
| Mallorca t-shirt | EN | Product + location |
| Tramuntana t-shirt | EN | Product + location |
| camiseta Mallorca | ES | Product + location |
| camiseta Tramuntana | ES | Product + location |
| diseño Mallorca camiseta | ES | Design + location |
| geometric bear shirt | EN | Design-specific |

Meta descriptions and page titles should incorporate these naturally. Blog content (future) can target long-tail keywords like "regalos originales Mallorca", "camisetas con diseño Mallorca".

### Server-Side Rendering

Product pages use **Incremental Static Regeneration (ISR)**:
```typescript
export const revalidate = 60 // revalidate every 60 seconds
// Or on-demand revalidation via webhook when product changes
```

This means product pages are:
- Pre-rendered at build time (fast initial load)
- Re-validated every 60s or on-demand (fresh prices/inventory)
- Served from CDN edge (Vercel)

### Dynamic Sitemap

Route: `app/sitemap.ts` -- generates a sitemap.xml dynamically:
- Lists all active products with their `lastModified` date
- Lists all category pages
- Lists static pages (about, etc.)
- Submitted to Google Search Console

### Robots.txt

Route: `app/robots.ts`:
```
Allow: /
Sitemap: https://example.com/sitemap.xml
```

### Structured Data (JSON-LD)

On product detail pages, include Product schema:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Bear Logo Classic T-Shirt",
  "description": "...",
  "image": "https://...",
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "EUR",
    "lowPrice": "29.99",
    "highPrice": "34.99",
    "availability": "https://schema.org/InStock"
  }
}
```

Also include Organization schema on homepage.

### Open Graph & Twitter Cards

Every page generates appropriate OG tags:
- `og:title`, `og:description`, `og:image` (product mockup)
- `og:type: product` for product pages
- `twitter:card: summary_large_image`

### Canonical URLs

Every page includes a self-referencing canonical URL to prevent duplicate content issues.

### Meta Descriptions

Product pages: auto-generated from product description, truncated to 155 chars.
Category pages: descriptive text based on category.

## Performance

### Image Optimization

All product images go through `next/image`:
```typescript
<Image
  src={product.images[0]}
  alt={product.name}
  width={600}
  height={600}
  priority={isAboveFold}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

- Priority loading for first product image
- Lazy loading for below-fold images
- WebP format via Vercel automatic image optimization
- Proper `sizes` attribute for responsive images

### Caching Strategy

| Resource | Cache Strategy |
|---|---|
| Product pages | ISR, revalidate: 60s |
| API product data | CDN cache, 60s TTL |
| Cart API | No cache (dynamic) |
| Static assets (CSS, JS) | 1 year immutable |
| Product images | CDN cache, 1 month |
| Printful mockups | CDN cache via Vercel, permanent |

### Bundle Size

- shadcn/ui components are tree-shakable
- No heavy animation libraries for MVP
- Dynamic imports for heavy components (size guide modal, etc.)
- Route-based code splitting (Next.js default)

### Core Web Vitals Targets

| Metric | Target |
|---|---|
| LCP | < 2.5s |
| FID/INP | < 100ms |
| CLS | < 0.1 |
| TTFB | < 800ms (edge) |

## Lighthouse Audit

Run Lighthouse on every deployment (CI check or manual). Target:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 95

## Compression

All responses compressed via Vercel's edge network (Brotli).
