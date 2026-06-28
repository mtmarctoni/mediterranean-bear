/**
 * Shared product query helpers for the storefront and API routes.
 *
 * Centralised so the listing route, detail route and pages all agree on the
 * shape of a "product with variants" payload.
 */

import { db } from "@/lib/db";
import {
  categories,
  product_designs,
  product_variants,
  products,
} from "@/lib/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePriceCents: number;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  images: string[];
  /** Min price across active variants (cents), falls back to base price. */
  priceFromCents: number;
  /** Max price across active variants (cents), falls back to base price. */
  priceToCents: number;
  /** Distinct colors available across active variants. */
  colors: { color: string; colorHex: string }[];
  variantCount: number;
  printfulStoreProductId: number;
  sortOrder: number;
}

export interface ProductVariantDTO {
  id: string;
  productId: string;
  printfulVariantId: number;
  size: string;
  color: string;
  colorHex: string;
  priceOverrideCents: number | null;
  /** Effective price in cents (override or product base). */
  priceCents: number;
  status: "active" | "inactive";
  sortOrder: number;
}

export interface ProductDesignDTO {
  id: string;
  placement: string;
  technique: string;
  printFileUrl: string;
  printfulFileId: number | null;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePriceCents: number;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  images: string[];
  printfulStoreProductId: number;
  status: "draft" | "active" | "archived";
  sortOrder: number;
  variants: ProductVariantDTO[];
  designs: ProductDesignDTO[];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export type SortKey = "price-asc" | "price-desc" | "name" | "newest";

export const DEFAULT_PAGE_LIMIT = 24;

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * List active products with their active variants aggregated.
 * Supports optional category filter and sort.
 */
export async function listProducts(opts: {
  category?: string | null;
  sort?: SortKey;
  page?: number;
  limit?: number;
}): Promise<{ items: ProductListItem[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.max(1, Math.min(100, opts.limit ?? DEFAULT_PAGE_LIMIT));
  const offset = (page - 1) * limit;

  const conditions = [
    eq(products.status, "active"),
    sql`${products.deleted_at} IS NULL`,
  ];
  if (opts.category) {
    conditions.push(eq(categories.slug, opts.category));
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      basePriceCents: products.base_price_cents,
      categoryId: products.category_id,
      categoryName: categories.name,
      categorySlug: categories.slug,
      images: products.images,
      printfulStoreProductId: products.printful_store_product_id,
      sortOrder: products.sort_order,
      createdAt: products.created_at,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.category_id))
    .where(and(...conditions));

  if (rows.length === 0) {
    return { items: [], total: 0 };
  }

  const productIds = rows.map((r) => r.id);

  // Pull active variants (color + override) for these products in one query.
  const variants = await db
    .select({
      productId: product_variants.product_id,
      color: product_variants.color,
      colorHex: product_variants.color_hex,
      priceOverrideCents: product_variants.price_override_cents,
    })
    .from(product_variants)
    .where(
      and(
        inArray(product_variants.product_id, productIds),
        eq(product_variants.status, "active"),
      ),
    );

  // Aggregate per product.
  const aggByProduct = new Map<
    string,
    {
      colors: Map<string, { color: string; colorHex: string }>;
      prices: { min: number; max: number };
      count: number;
    }
  >();
  const baseByProduct = new Map<string, number>();
  for (const r of rows) baseByProduct.set(r.id, r.basePriceCents);

  for (const v of variants) {
    let bucket = aggByProduct.get(v.productId);
    if (!bucket) {
      bucket = {
        colors: new Map(),
        prices: { min: Number.POSITIVE_INFINITY, max: 0 },
        count: 0,
      };
      aggByProduct.set(v.productId, bucket);
    }
    bucket.count += 1;
    if (!bucket.colors.has(v.color)) {
      bucket.colors.set(v.color, { color: v.color, colorHex: v.colorHex });
    }
    const base = baseByProduct.get(v.productId) ?? 0;
    const eff = v.priceOverrideCents ?? base;
    if (eff < bucket.prices.min) bucket.prices.min = eff;
    if (eff > bucket.prices.max) bucket.prices.max = eff;
  }

  const items: ProductListItem[] = rows.map((r) => {
    const bucket = aggByProduct.get(r.id);
    const minPrice =
      bucket && bucket.prices.min !== Number.POSITIVE_INFINITY
        ? bucket.prices.min
        : r.basePriceCents;
    const maxPrice =
      bucket && bucket.prices.max > 0 ? bucket.prices.max : r.basePriceCents;
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      basePriceCents: r.basePriceCents,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      categorySlug: r.categorySlug,
      images: r.images ?? [],
      priceFromCents: minPrice,
      priceToCents: maxPrice,
      colors: bucket ? Array.from(bucket.colors.values()) : [],
      variantCount: bucket?.count ?? 0,
      printfulStoreProductId: r.printfulStoreProductId,
      sortOrder: r.sortOrder,
    };
  });

  const sort = opts.sort ?? "newest";
  items.sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return a.priceFromCents - b.priceFromCents;
      case "price-desc":
        return b.priceFromCents - a.priceFromCents;
      case "name":
        return a.name.localeCompare(b.name);
      case "newest":
      default:
        return b.sortOrder - a.sortOrder || a.name.localeCompare(b.name);
    }
  });

  const total = items.length;
  const paged = items.slice(offset, offset + limit);
  return { items: paged, total };
}

/** Fetch a single product (active or not) by slug with variants and designs. */
export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      basePriceCents: products.base_price_cents,
      categoryId: products.category_id,
      categoryName: categories.name,
      categorySlug: categories.slug,
      images: products.images,
      printfulStoreProductId: products.printful_store_product_id,
      status: products.status,
      sortOrder: products.sort_order,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.category_id))
    .where(and(eq(products.slug, slug), sql`${products.deleted_at} IS NULL`))
    .limit(1);

  if (rows.length === 0) return null;
  const p = rows[0]!;

  const [variants, designs] = await Promise.all([
    db
      .select()
      .from(product_variants)
      .where(eq(product_variants.product_id, p.id))
      .orderBy(asc(product_variants.sort_order), asc(product_variants.color)),
    db
      .select()
      .from(product_designs)
      .where(eq(product_designs.product_id, p.id)),
  ]);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    basePriceCents: p.basePriceCents,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    categorySlug: p.categorySlug,
    images: p.images ?? [],
    printfulStoreProductId: p.printfulStoreProductId,
    status: p.status,
    sortOrder: p.sortOrder,
    variants: variants.map((v) => ({
      id: v.id,
      productId: v.product_id,
      printfulVariantId: v.printful_variant_id,
      size: v.size,
      color: v.color,
      colorHex: v.color_hex,
      priceOverrideCents: v.price_override_cents,
      priceCents: v.price_override_cents ?? p.basePriceCents,
      status: v.status,
      sortOrder: v.sort_order,
    })),
    designs: designs.map((d) => ({
      id: d.id,
      placement: d.placement,
      technique: d.technique,
      printFileUrl: d.print_file_url,
      printfulFileId: d.printful_file_id,
    })),
  };
}

/** List all categories sorted by sort_order then name. */
export async function listCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      sortOrder: categories.sort_order,
    })
    .from(categories)
    .orderBy(asc(categories.sort_order), asc(categories.name));
}
