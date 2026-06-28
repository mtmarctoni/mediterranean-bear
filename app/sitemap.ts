import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Dynamic sitemap (app/sitemap.ts).
 *
 * Lists every indexable URL on the site:
 *  - Static pages (home, products, about, sign-in, sign-up, cart)
 *  - Category pages (?category=<slug>) -- one entry per category
 *  - Active product detail pages (/products/[slug]) with lastModified from
 *    the product's `updated_at`.
 *
 * Admin, account, checkout and API routes are excluded (see robots.ts).
 * The DB read is best-effort: if the database is unreachable we still emit
 * the static URLs so the sitemap never 500s. See plans/008.
 */

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mediterraneanbear.marctonimas.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // Category listing pages (?category=<slug>).
  let categoryUrls: MetadataRoute.Sitemap = [];
  let productUrls: MetadataRoute.Sitemap = [];

  try {
    const cats = await db
      .select({ slug: categories.slug, updatedAt: categories.created_at })
      .from(categories)
      .orderBy(categories.slug);
    categoryUrls = cats.map((c) => ({
      url: `${baseUrl}/products?category=${encodeURIComponent(c.slug)}`,
      lastModified: c.updatedAt ?? now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const activeProducts = await db
      .select({ slug: products.slug, updatedAt: products.updated_at })
      .from(products)
      .where(
        sql`${products.deleted_at} IS NULL AND ${eq(
          products.status,
          "active",
        )}`,
      )
      .orderBy(products.slug);
    productUrls = activeProducts.map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt ?? now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch (err) {
    // If the DB is unreachable, fall back to static URLs only.
    console.error("[sitemap] failed to load dynamic URLs:", err);
  }

  return [...staticUrls, ...categoryUrls, ...productUrls];
}