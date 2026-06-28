# 002 -- Product Catalog

## Concept

Each "product" in our store = one design applied to a Printful product (e.g. "Tramuntana grande" t-shirt, "Taza MB Clasica" mug). A product has:
- Basic info: name, slug, description, base price
- Multiple **variants**: size + color combinations (apparel) or material/color (accessories)
- Multiple **design placements**: which print files go where (front, back, sleeve)
- **Mockup images**: generated via Printful Mockup Generator or fetched from Printful store

Each variant maps 1:1 to a Printful **store product variant** (e.g. Bella+Canvas 3001, Black, Size M).

## Existing Printful Store Products

We already have products configured in our Printful store. MVP syncs these, not new ones:

| Product Name | Printful Store Product ID | Type |
|---|---|---|
| Tramuntana grande | 393040828 | T-shirt |
| Funda MB | 381908498 | Phone case |
| Funda MB Grande | 381918235 | Phone case (large) |
| Taza MB Clasica | 379589623 | Mug |
| GeoBear | 375651059 | T-shirt |
| GeoBear | 375648828 | T-shirt |
| GeoHead | 375648827 | T-shirt |
| GeoHead | 375648571 | T-shirt |
| Mediterranean Bear Espalda | 363652013 | T-shirt (back design) |

## Two Data Sources

| Data | Source | Why |
|---|---|---|
| Product metadata (name, desc, price) | Our Postgres | Full control, fast queries |
| Available sizes & colors | Printful Store Products API | Always in sync with Printful |
| Variant IDs (printful_variant_id) | Stored in our DB | Maps our products to Printful fulfillment |
| Print files (design PNGs) | Already in Printful (from store product config) | Our original artwork |
| Mockup images | Printful store product images / Mockup Generator | Consistent, realistic previews |

## Product Sync Flow (from Printful Store)

Products already exist in Printful. We sync them into our DB:

1. Admin triggers sync via admin panel (or seed script)
2. For each Printful store product ID:
   a. `GET /v2/store-products/{id}` -> fetch product details, variants, mockup images
   b. `GET /v2/store-products/{id}/variants` -> fetch all variant info (size, color, hex, stock)
   c. Map to our DB schema:
      - Create `products` row (name, images from mockups, base price from Printful retail price)
      - Create `product_variants` rows (one per Printful variant, with `printful_variant_id`)
      - Create `product_designs` rows (from Printful product's print file placements)
   d. Set product status to 'active' or 'draft' (admin chooses)
3. Store `printful_store_product_id` on our `products` table for future re-sync

This is a read-only sync -- product creation and design configuration happens in Printful's dashboard. Our site reflects what Printful already has.

## Product Listing (Storefront)

- `GET /api/products` returns active products with their active variants
- Products rendered via ISR (revalidate every 60 seconds, or on-demand on product change)
- Filtering by category (t-shirts, accessories), sorting by price/name/newest
- Each product card shows first mockup image, name, price range

## Product Detail Page

- Route: `/products/[slug]`
- Hero image gallery (mockups from multiple angles)
- Size selector (dropdown or button group) -- only for apparel
- Color selector (swatch circles with hex colors) -- for apparel and accessories
- Add to cart button
- Price displayed (adjusts if variant has price override)
- Size guide modal (fetched from Printful or static) -- apparel only

## Categories

Initial categories based on our product types:
- **T-shirts** (Tramuntana, GeoBear x2, GeoHead x2, Mediterranean Bear Espalda)
- **Accessories** (Funda MB, Funda MB Grande, Taza MB Clasica)

Simple flat category list (no nesting needed for MVP). Categories shown in navigation and product listing filter.

## Printful Store Product Mapping

Each of our products maps to a Printful store product. We store the Printful store product ID on our product record. When an order comes in, we send the specific `printful_variant_id` to Printful's order API.

| Our DB Field | Printful Source | Notes |
|---|---|---|
| `products.printful_store_product_id` | Store product ID | For re-sync and reference |
| `product_variants.printful_variant_id` | Store product variant ID | Used in order submission |
| `product_variants.size` | Variant detail | e.g. 'S', 'M', 'L' (apparel) or null (mug) |
| `product_variants.color` | Variant detail | e.g. 'Black', 'White' |
| `product_variants.color_hex` | Variant detail | e.g. '#000000' |
| `product_designs.print_file_url` | Store product print files | Already configured in Printful |
| `product_designs.printful_file_id` | Printful file library ID | For reference |

## Mockup Images

Mockup images are already generated in Printful for store products. We fetch them during sync and store the URLs in the product's `images` JSONB field.

If we need new mockups, Printful's Mockup Generator API can generate them:
```
POST /v2/mockup-generator/generate
  -> Returns task ID
Poll /v2/mockup-generator/task/{id}
  -> Returns mockup image URLs
```

## Printful API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `GET /v2/store-products` | List all store products |
| `GET /v2/store-products/{id}` | Get specific store product details + mockups |
| `GET /v2/store-products/{id}/variants` | Get variants (size, color, stock) |
| `GET /v2/catalog-variants/{id}` | Get catalog variant details (for reference) |
| `POST /v2/orders` | Create fulfillment order (see plan 004) |
| `POST /v2/mockup-generator/generate` | Generate new mockups (if needed) |
| `GET /v2/mockup-generator/task/{id}` | Poll mockup generation status |

## Schema Addition

Add `printful_store_product_id` to the `products` table:

| Column | Type | Notes |
|---|---|---|
| printful_store_product_id | integer | Printful store product ID for sync |
