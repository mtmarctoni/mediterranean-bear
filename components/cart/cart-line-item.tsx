"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useCart, type CartItem } from "@/lib/cart/store";

interface CartLineItemProps {
  item: CartItem;
  /** When true, render compactly (used in the drawer). */
  compact?: boolean;
}

/**
 * A single cart line item with thumbnail, details, quantity controls and remove.
 * Used in both the cart drawer and the full cart page.
 */
export function CartLineItem({ item, compact = false }: CartLineItemProps) {
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeItem = useCart((s) => s.removeItem);

  const lineTotal = item.quantity * item.unitPriceCents;

  return (
    <div
      className={
        "flex gap-3 py-3 " + (compact ? "" : "sm:gap-4 sm:py-4")
      }
    >
      <Link
        href={`/products/${item.productSlug}`}
        className="relative aspect-square shrink-0 overflow-hidden rounded-md border border-border bg-muted"
        aria-label={item.productName}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.productName}
            fill
            sizes={compact ? "64px" : "96px"}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-text-muted">
            No image
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/products/${item.productSlug}`}
            className="line-clamp-2 text-sm font-medium text-foreground hover:underline"
          >
            {item.productName}
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeItem(item.productVariantId)}
            aria-label="Remove item"
            className="text-text-muted hover:text-danger"
          >
            <Trash2 />
          </Button>
        </div>

        <p className="mt-0.5 text-xs text-text-muted">
          {item.variantColor}
          {item.variantSize ? ` · ${item.variantSize}` : ""}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                updateQuantity(item.productVariantId, item.quantity - 1)
              }
              disabled={item.quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus />
            </Button>
            <span
              className="w-8 text-center text-sm tabular-nums"
              aria-live="polite"
            >
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                updateQuantity(item.productVariantId, item.quantity + 1)
              }
              disabled={item.quantity >= 10}
              aria-label="Increase quantity"
            >
              <Plus />
            </Button>
          </div>
          <p className="text-sm font-medium text-foreground">
            {formatPrice(lineTotal)}
          </p>
        </div>
      </div>
    </div>
  );
}
