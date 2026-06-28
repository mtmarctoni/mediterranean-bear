"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortKey } from "@/lib/products/queries";
import type { listCategories } from "@/lib/products/queries";

const SORT_LABELS: Record<SortKey, string> = {
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  name: "Name: A to Z",
  newest: "Newest",
};

interface ProductFiltersProps {
  categories: Awaited<ReturnType<typeof listCategories>>;
  currentCategory: string | null;
  currentSort: SortKey;
}

/**
 * Client-side filter bar. Updates the URL search params in-place when the
 * user changes category or sort, which re-runs the server component.
 */
export function ProductFilters({
  categories,
  currentCategory,
  currentSort,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const navigate = useCallback(
    (next: { category?: string | null; sort?: SortKey }) => {
      const params = new URLSearchParams(sp?.toString() ?? "");
      const category = next.category ?? currentCategory;
      const sort = next.sort ?? currentSort;
      if (category) params.set("category", category);
      else params.delete("category");
      if (sort && sort !== "newest") params.set("sort", sort);
      else params.delete("sort");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, sp, currentCategory, currentSort],
  );

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav
        className="flex flex-wrap items-center gap-2"
        aria-label="Categories"
      >
        <FilterLink
          href={buildHref(null, currentSort)}
          active={currentCategory === null}
        >
          All
        </FilterLink>
        {categories.map((c) => (
          <FilterLink
            key={c.slug}
            href={buildHref(c.slug, currentSort)}
            active={currentCategory === c.slug}
          >
            {c.name}
          </FilterLink>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="text-xs text-text-muted">
          Sort
        </label>
        <Select
          value={currentSort}
          onValueChange={(v) => {
            if (typeof v === "string" && v in SORT_LABELS) {
              navigate({ sort: v as SortKey });
            }
          }}
        >
          <SelectTrigger id="sort" size="sm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function buildHref(category: string | null, sort: SortKey): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort !== "newest") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-3 py-1 text-xs transition " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-text hover:border-primary/50")
      }
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
