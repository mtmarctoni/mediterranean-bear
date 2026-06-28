import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant loading fallback for the public order detail page. Mirrors the real
 * page layout: a header with status, a progress strip, and skeleton cards for
 * items + tracking + status history. See plans/008.
 */
export default function OrderLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32" />
      </header>

      <Skeleton className="h-1.5 w-full rounded-full" />

      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-surface p-6">
          <Skeleton className="mb-4 h-5 w-20" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <Skeleton className="my-4 h-px w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-6">
            <Skeleton className="mb-4 h-5 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <Skeleton className="mb-4 h-5 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}