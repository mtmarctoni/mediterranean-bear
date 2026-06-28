import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant loading fallback for the product detail page. Mirrors the real
 * layout: a breadcrumb, a two-column grid (gallery + details), and skeleton
 * blocks for the title, price, description, and variant selectors.
 */
export default function ProductDetailLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-xs" aria-label="Breadcrumb">
        <Skeleton className="h-4 w-48" />
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="size-16 shrink-0 rounded-md" />
            <Skeleton className="size-16 shrink-0 rounded-md" />
            <Skeleton className="size-16 shrink-0 rounded-md" />
          </div>
        </div>

        {/* Details + variant selectors */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-16 rounded-md" />
              <Skeleton className="h-9 w-16 rounded-md" />
              <Skeleton className="h-9 w-16 rounded-md" />
              <Skeleton className="h-9 w-16 rounded-md" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-28" />
          </div>
        </div>
      </div>
    </main>
  );
}
