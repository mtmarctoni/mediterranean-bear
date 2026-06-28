"use client";

import { useEffect } from "react";

import { useCart } from "@/lib/cart/store";

/**
 * Hydrates the client cart from the server on app mount, once localStorage
 * rehydration has completed. Server quantities take precedence; client-only
 * items are pushed up to the server. Renders nothing.
 *
 * Mounted once in the root layout so every page has an up-to-date cart.
 */
export function CartHydrator() {
  const hydrated = useCart((s) => s.hydrated);
  const hydrateFromServer = useCart((s) => s.hydrateFromServer);

  useEffect(() => {
    if (!hydrated) return;
    void hydrateFromServer();
  }, [hydrated, hydrateFromServer]);

  return null;
}
