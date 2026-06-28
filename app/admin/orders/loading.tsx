import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant loading fallback for the admin orders list. Mirrors the real
 * page layout: a page header and a skeleton table of recent orders.
 * See plans/008.
 */
export default function AdminOrdersLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-28" />
      </header>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border bg-surface-muted px-4 py-3">
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}