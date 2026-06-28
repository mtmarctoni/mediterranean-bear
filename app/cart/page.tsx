import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { CartContents } from "@/components/cart/cart-contents";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cart | Mediterranean Bear",
  description: "Review the items in your cart.",
};

/**
 * Full-page cart. The interactive contents (line items, totals, checkout CTA)
 * live in a client component because they read from the Zustand store.
 */
export default function CartPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Your cart
        </h1>
      </header>

      <CartContents
        emptyState={
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-muted p-12 text-center">
            <ShoppingBag className="size-10 text-text-muted" />
            <h2 className="text-sm font-medium text-foreground">
              Your cart is empty
            </h2>
            <p className="max-w-sm text-xs text-text-muted">
              Browse the catalog and add something you love.
            </p>
            <Button render={<Link href="/products" />}>Start shopping</Button>
          </div>
        }
      />
    </main>
  );
}
