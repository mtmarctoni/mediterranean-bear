"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart/store";

interface CartContentsProps {
  /** Rendered when the cart is empty (after hydration). */
  emptyState: React.ReactNode;
}

/**
 * Client-rendered cart contents shared by the cart page and (potentially)
 * the drawer's expanded view. Reads from the Zustand store.
 */
export function CartContents({ emptyState }: CartContentsProps) {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotalCents());
  const itemCount = useCart((s) => s.itemCount());
  const hydrated = useCart((s) => s.hydrated);

  // Ensure localStorage hydration has happened.
  useEffect(() => {
    if (!hydrated) useCart.persist.rehydrate();
  }, [hydrated]);

  if (hydrated && items.length === 0) {
    return <>{emptyState}</>;
  }

  // Before hydration, render a zero-state placeholder to avoid flicker.
  if (!hydrated) {
    return <div className="h-64" aria-hidden />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        {itemCount > 0
          ? `${itemCount} item${itemCount === 1 ? "" : "s"}`
          : ""}
      </p>

      <Separator />

      <div className="divide-y divide-border">
        {items.map((item) => (
          <CartLineItem key={item.productVariantId} item={item} />
        ))}
      </div>

      <Separator />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <span className="text-text-muted">Subtotal</span>{" "}
          <span className="font-medium text-foreground">
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/products" />}>
            Continue shopping
          </Button>
          <Button render={<Link href="/checkout" />}>Proceed to checkout</Button>
        </div>
      </div>
    </div>
  );
}
