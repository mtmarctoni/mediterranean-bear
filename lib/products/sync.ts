/**
 * Product sync logic: pull store products from Printful and upsert into our DB.
 *
 * See plans/002-product-catalog.md. This is a read-only sync -- we reflect what
 * Printful already has. Product creation and design configuration happen in
 * Printful's dashboard.
 */

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  categories,
  product_designs,
  product_variants,
  products,
} from "@/lib/db/schema";
import {
  KNOWN_STORE_PRODUCT_IDS,
  parsePriceToCents,
  printful,
  printfulTypeToCategorySlug,
  slugify,
  type PrintFilePlacement,
  type StoreProduct,
  type StoreProductVariant,
} from "@/lib/printful";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface SyncResult {
  synced: number;
  products: {
    printfulStoreProductId: number;
    name: string;
    slug: string;
    variants: number;
    designs: number;
  }[];
  errors: { printfulStoreProductId: number; error: string }[];
}

/* -------------------------------------------------------------------------- */
/* Category helpers                                                           */
/* -------------------------------------------------------------------------- */

/** Ensure the two MVP categories exist and return a slug -> id map. */
async function ensureCategories(): Promise<Map<string, string>> {
  const defs = [
    { name: "T-shirts", slug: "t-shirts", sort_order: 0 },
    { name: "Accessories", slug: "accessories", sort_order: 1 },
  ];
  const map = new Map<string, string>();

  for (const def of defs) {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, def.slug))
      .limit(1);
    if (existing.length > 0) {
      map.set(def.slug, existing[0]!.id);
      continue;
    }
    const [created] = await db
      .insert(categories)
      .values(def)
      .returning({ id: categories.id });
    map.set(def.slug, created!.id);
  }

  return map;
}

/* -------------------------------------------------------------------------- */
/* Upserts                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Upsert a single store product (and its variants + designs) into our DB.
 * Returns counts of variants and designs written.
 */
async function upsertStoreProduct(
  storeProduct: StoreProduct,
  variants: StoreProductVariant[],
  categoryBySlug: Map<string, string>,
): Promise<{ slug: string; variants: number; designs: number }> {
  const categorySlug = printfulTypeToCategorySlug(storeProduct.type);
  const categoryId = categoryBySlug.get(categorySlug) ?? null;

  // Append the Printful store product id to the slug to guarantee uniqueness
  // when two store products share a name (e.g. duplicate "GeoBear" entries).
  const slug = `${slugify(storeProduct.name)}-${storeProduct.id}`;
  const images = (storeProduct.images ?? [])
    .map((img) => img.url)
    .filter(Boolean);
  // Fall back to the catalog image if no mockups present.
  if (images.length === 0 && storeProduct.image) {
    images.push(storeProduct.image);
  }

  // Pick the lowest variant price as the base price so the detail page shows
  // the "from" price and selecting a pricier variant increases the total.
  const basePriceCents =
    variants
      .map((v) =>
        v.retail_price ? parsePriceToCents(v.retail_price) : parsePriceToCents(v.price),
      )
      .reduce((min, n) => (n < min ? n : min), Infinity) || 0;

  // Upsert product.
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.printful_store_product_id, storeProduct.id))
    .limit(1);

  let productId: string;
  if (existing.length > 0) {
    productId = existing[0]!.id;
    await db
      .update(products)
      .set({
        name: storeProduct.name,
        slug,
        description: storeProduct.description ?? "",
        base_price_cents: basePriceCents,
        category_id: categoryId,
        images,
        status: "active",
        updated_at: new Date(),
      })
      .where(eq(products.id, productId));
  } else {
    const [created] = await db
      .insert(products)
      .values({
        name: storeProduct.name,
        slug,
        description: storeProduct.description ?? "",
        base_price_cents: basePriceCents,
        category_id: categoryId,
        printful_store_product_id: storeProduct.id,
        status: "active",
        images,
      })
      .returning({ id: products.id });
    productId = created!.id;
  }

  // Upsert variants.
  let variantsWritten = 0;
  for (const v of variants) {
    if (v.is_discontinued) continue;
    const priceOverrideCents =
      v.retail_price && parsePriceToCents(v.retail_price) !== basePriceCents
        ? parsePriceToCents(v.retail_price)
        : null;

    const existingVariant = await db
      .select({ id: product_variants.id })
      .from(product_variants)
      .where(eq(product_variants.printful_variant_id, v.id))
      .limit(1);

    const size = v.size ?? "";
    const color = v.color ?? "";
    const colorHex = v.color_hex ?? "#ffffff";

    if (existingVariant.length > 0) {
      await db
        .update(product_variants)
        .set({
          size,
          color,
          color_hex: colorHex,
          price_override_cents: priceOverrideCents,
          status: v.out_of_stock ? "inactive" : "active",
          updated_at: new Date(),
        })
        .where(eq(product_variants.id, existingVariant[0]!.id));
    } else {
      await db.insert(product_variants).values({
        product_id: productId,
        printful_variant_id: v.id,
        size,
        color,
        color_hex: colorHex,
        price_override_cents: priceOverrideCents,
        status: v.out_of_stock ? "inactive" : "active",
      });
    }
    variantsWritten += 1;
  }

  // Upsert designs from print file placements (if Printful returned any).
  let designsWritten = 0;
  const placements: PrintFilePlacement[] = storeProduct.printfiles ?? [];
  for (const placement of placements) {
    if (!placement.url) continue;
    const existingDesign = await db
      .select({ id: product_designs.id })
      .from(product_designs)
      .where(
        and(
          eq(product_designs.product_id, productId),
          eq(product_designs.placement, placement.placement),
        ),
      )
      .limit(1);

    const technique = placement.technique ?? "dtg";
    if (existingDesign.length > 0) {
      await db
        .update(product_designs)
        .set({
          technique,
          print_file_url: placement.url,
          printful_file_id: placement.printfile_id ?? null,
          updated_at: new Date(),
        })
        .where(eq(product_designs.id, existingDesign[0]!.id));
    } else {
      await db.insert(product_designs).values({
        product_id: productId,
        placement: placement.placement,
        technique,
        print_file_url: placement.url,
        printful_file_id: placement.printfile_id ?? null,
      });
    }
    designsWritten += 1;
  }

  return { slug, variants: variantsWritten, designs: designsWritten };
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Sync all known Printful store products into our DB.
 * Throws if the Printful client is not configured.
 */
export async function syncProductsFromPrintful(
  storeProductIds: number[] = KNOWN_STORE_PRODUCT_IDS,
): Promise<SyncResult> {
  if (!printful.isConfigured()) {
    throw new Error(
      "PRINTFUL_API_KEY is not set. Configure it before syncing products.",
    );
  }

  const categoryBySlug = await ensureCategories();
  const result: SyncResult = { synced: 0, products: [], errors: [] };

  for (const id of storeProductIds) {
    try {
      const [storeProduct, variants] = await Promise.all([
        printful.getStoreProduct(id),
        printful.getStoreProductVariants(id),
      ]);
      const summary = await upsertStoreProduct(
        storeProduct,
        variants,
        categoryBySlug,
      );
      result.synced += 1;
      result.products.push({
        printfulStoreProductId: id,
        name: storeProduct.name,
        slug: summary.slug,
        variants: summary.variants,
        designs: summary.designs,
      });
    } catch (err) {
      result.errors.push({
        printfulStoreProductId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
