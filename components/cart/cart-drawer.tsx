"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart/store";

/**
 * Slide-over cart drawer. Visibility is controlled by the Zustand store's
 * `isOpen` flag. Always mounted in the layout so any "Add to cart" can open it.
 */
export function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const openCart = useCart((s) => s.openCart);
  const closeCart = useCart((s) => s.closeCart);
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotalCents());
  const itemCount = useCart((s) => s.itemCount());
  const hydrated = useCart((s) => s.hydrated);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    // The persist middleware rehydrates automatically; this just flips the
    // hydrated flag if it hasn't happened yet (e.g. SSR-safe mount).
    if (!hydrated) {
      // Zustand persist calls onRehydrateStorage which sets hydrated=true.
      // As a fallback, also flip it here.
      useCart.persist.rehydrate();
    }
  }, [hydrated]);

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (o ? openCart() : closeCart())}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {itemCount > 0
              ? `${itemCount} item${itemCount === 1 ? "" : "s"}`
              : "Your cart is empty"}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShoppingBag className="size-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              Your cart is empty. Start shopping to add items.
            </p>
            <Button render={<Link href="/products" />}>Start shopping</Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4">
            {items.map((item) => (
              <CartLineItem key={item.productVariantId} item={item} compact />
            ))}
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter className="border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Subtotal</span>
              <span className="font-medium text-foreground">
                {formatPrice(subtotal)}
              </span>
            </div>
            <Separator />
            <Button render={<Link href="/checkout" />} size="lg">
              Checkout
            </Button>
            <Button
              variant="outline"
              render={<Link href="/products" />}
              onClick={() => closeCart()}
            >
              Continue shopping
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
