import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant loading fallback for the product grid page. Mirrors the real page
 * layout: a header, a filter bar placeholder, and a 2/3/4-column skeleton
 * card grid.
 */
export default function ProductsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-28" />
      </header>

      {/* Filter bar placeholder */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
        <Skeleton className="h-8 w-44" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex items-center gap-1 pt-1">
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="size-3.5 rounded-full" />
        </div>
      </div>
    </div>
  );
}
