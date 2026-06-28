"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart/store";

const NAV_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
];

/**
 * Site header. Sticky top bar with brand, nav, cart icon (with live count
 * badge from Zustand) and an account placeholder. Mobile nav uses a Sheet.
 */
export function Header() {
  const itemCount = useCart((s) => s.itemCount());
  const openCart = useCart((s) => s.openCart);
  const hydrated = useCart((s) => s.hydrated);

  const [mobileOpen, setMobileOpen] = useState(false);

  // Manually trigger rehydration on mount as a fallback.
  useEffect(() => {
    if (!hydrated) useCart.persist.rehydrate();
  }, [hydrated]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Mobile menu */}
        <div className="flex items-center gap-1 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {NAV_LINKS.map((link) => (
                  <Button
                    key={link.href}
                    variant="ghost"
                    className="justify-start"
                    render={<Link href={link.href} />}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Brand */}
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-primary"
        >
          Mediterranean Bear
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              render={<Link href={link.href} />}
            >
              {link.label}
            </Button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account"
            render={<Link href="/account" />}
          >
            <User />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open cart"
            onClick={() => openCart()}
            className="relative"
          >
            <ShoppingBag />
            {hydrated && itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-medium text-secondary-foreground"
                aria-label={`${itemCount} items in cart`}
              >
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
