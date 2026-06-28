"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { ProductVariantDTO } from "@/lib/products/queries";

interface VariantSelectorProps {
  variants: ProductVariantDTO[];
  /** Called when the selected variant changes (or null when none selected). */
  onSelect?: (variant: ProductVariantDTO | null) => void;
}

/**
 * Variant selector: color swatches + size buttons.
 * - Sizes shown are only those available for the currently selected color.
 * - Out-of-stock variants render as disabled.
 */
export function VariantSelector({ variants, onSelect }: VariantSelectorProps) {
  const activeVariants = useMemo(
    () => variants.filter((v) => v.status === "active"),
    [variants],
  );

  const colors = useMemo(() => {
    const map = new Map<string, { color: string; colorHex: string }>();
    for (const v of activeVariants) {
      if (!map.has(v.color)) {
        map.set(v.color, { color: v.color, colorHex: v.colorHex });
      }
    }
    return Array.from(map.values());
  }, [activeVariants]);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    colors[0]?.color ?? null,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const sizesForColor = useMemo(() => {
    if (!selectedColor) return [];
    return activeVariants
      .filter((v) => v.color === selectedColor)
      .sort((a, b) => a.size.localeCompare(b.size));
  }, [activeVariants, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (!selectedColor || !selectedSize) return null;
    return (
      activeVariants.find(
        (v) => v.color === selectedColor && v.size === selectedSize,
      ) ?? null
    );
  }, [activeVariants, selectedColor, selectedSize]);

  // Notify parent of selection changes.
  useEffect(() => {
    onSelect?.(selectedVariant);
  }, [selectedVariant, onSelect]);

  if (activeVariants.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        This product is currently unavailable.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {colors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Color{selectedColor ? `: ${selectedColor}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const selected = c.color === selectedColor;
              return (
                <button
                  key={c.color}
                  type="button"
                  title={c.color}
                  aria-label={c.color}
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedColor(c.color);
                    setSelectedSize(null);
                  }}
                  className={cn(
                    "size-8 rounded-full border-2 transition",
                    selected
                      ? "border-primary ring-2 ring-ring"
                      : "border-border hover:border-primary/50",
                  )}
                  style={{ backgroundColor: c.colorHex }}
                />
              );
            })}
          </div>
        </div>
      )}

      {sizesForColor.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Size{selectedSize ? `: ${selectedSize}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {sizesForColor.map((v) => {
              const selected = v.size === selectedSize;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedSize(v.size)}
                  aria-pressed={selected}
                  className={cn(
                    "min-w-10 rounded-md border px-3 py-1.5 text-sm transition",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-text hover:border-primary/50",
                  )}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
