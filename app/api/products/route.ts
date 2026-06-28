import type { NextRequest } from "next/server";

import {
  DEFAULT_PAGE_LIMIT,
  listCategories,
  listProducts,
  type SortKey,
} from "@/lib/products/queries";

export const dynamic = "force-dynamic";

const SORT_KEYS: SortKey[] = ["price-asc", "price-desc", "name", "newest"];

/**
 * GET /api/products
 *
 * Query params:
 *  - category: category slug to filter by
 *  - sort: price-asc | price-desc | name | newest
 *  - page: 1-based page number
 *  - limit: page size (1..100)
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const category = sp.get("category")?.trim() || null;
  const sortRaw = sp.get("sort")?.trim() || "newest";
  const sort: SortKey = SORT_KEYS.includes(sortRaw as SortKey)
    ? (sortRaw as SortKey)
    : "newest";
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.max(
    1,
    Math.min(100, Number.parseInt(sp.get("limit") ?? "", 10) || DEFAULT_PAGE_LIMIT),
  );

  const [{ items, total }, categories] = await Promise.all([
    listProducts({ category, sort, page, limit }),
    listCategories(),
  ]);

  return Response.json({
    items,
    total,
    page,
    limit,
    categories,
  });
}
