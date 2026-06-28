import type { Metadata } from "next";

import { ProductCard } from "@/components/product/product-card";
import { ProductFilters } from "@/components/product/product-filters";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listCategories,
  listProducts,
  type SortKey,
} from "@/lib/products/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse Mediterranean-inspired t-shirts and accessories. Designs inspired by Mallorca and the Tramuntana mountains, printed and shipped on demand.",
  alternates: { canonical: "/products" },
  openGraph: {
    type: "website",
    title: "Products | Mediterranean Bear",
    description:
      "Browse Mediterranean-inspired t-shirts and accessories. Designs inspired by Mallorca and the Tramuntana mountains, printed and shipped on demand.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/products`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Products | Mediterranean Bear",
    description:
      "Mediterranean-inspired t-shirts and accessories, printed on demand.",
  },
};

const SORT_KEYS: SortKey[] = ["price-asc", "price-desc", "name", "newest"];

interface PageProps {
  searchParams: Promise<{ category?: string; sort?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const category = sp.category?.trim() || null;
  const sortRaw = sp.sort?.trim() || "newest";
  const sort: SortKey = SORT_KEYS.includes(sortRaw as SortKey)
    ? (sortRaw as SortKey)
    : "newest";

  // Fetch products and categories in parallel. If the database is unreachable
  // (e.g. DATABASE_URL not configured), fall back to an empty listing so the
  // page still renders. The product sync route will surface a real error.
  let items: Awaited<ReturnType<typeof listProducts>>["items"] = [];
  let total = 0;
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  try {
    const [listing, cats] = await Promise.all([
      listProducts({ category, sort }),
      listCategories(),
    ]);
    items = listing.items;
    total = listing.total;
    categories = cats;
  } catch (err) {
    console.error("Failed to load products:", err);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Products
        </h1>
        <p className="text-sm text-text-muted">
          {total > 0
            ? `${total} product${total === 1 ? "" : "s"}`
            : "No products available yet."}
        </p>
      </header>

      <ProductFilters
        categories={categories}
        currentCategory={category}
        currentSort={sort}
      />

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-muted p-12 text-center">
      <Skeleton className="h-32 w-32 rounded-md" />
      <h2 className="text-sm font-medium text-foreground">No products yet</h2>
      <p className="max-w-sm text-xs text-text-muted">
        Products will appear here once the catalog is synced from Printful. Run
        the sync from the admin panel (or{" "}
        <code className="font-mono">POST /api/products/sync</code>).
      </p>
    </div>
  );
}
