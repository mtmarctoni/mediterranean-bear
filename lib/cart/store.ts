/**
 * Client-side cart store (Zustand 5) with localStorage persistence.
 *
 * Two-layer cart (see plans/006-cart-state.md):
 *  1. Client layer: this Zustand store for instant UI updates.
 *  2. Server layer: PostgreSQL-backed cart via /api/cart/* routes.
 *
 * On every mutation we update Zustand immediately, then sync to the server:
 *  - add / update quantity: debounced 500ms
 *  - remove item: immediate
 *
 * The store is keyed `mediterranean-bear-cart` in localStorage.
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface CartItem {
  productVariantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantSize: string | null;
  variantColor: string;
  variantColorHex: string;
  quantity: number;
  unitPriceCents: number;
  image: string;
}

/**
 * Shape returned by GET /api/cart. Defined locally (rather than imported from
 * the server module) so this client bundle never pulls in server-only code
 * such as the DB client.
 */
interface ServerCartItem {
  productVariantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantSize: string;
  variantColor: string;
  variantColorHex: string;
  quantity: number;
  unitPriceCents: number;
  image: string;
}
interface ServerCartDTO {
  items: ServerCartItem[];
  subtotalCents: number;
  itemCount: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  /** True once the store has been rehydrated from localStorage. */
  hydrated: boolean;

  // Computed (implemented as methods to keep selectors simple)
  itemCount: () => number;
  subtotalCents: () => number;

  // Actions
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productVariantId: string) => void;
  updateQuantity: (productVariantId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Sync
  hydrate: () => void;
  hydrateFromServer: () => Promise<void>;
  syncToServer: () => Promise<void>;
}

/** Min/max cart line quantities (per plans/006-cart-state.md & schema). */
export const MAX_LINE_QUANTITY = 10;
export const MIN_LINE_QUANTITY = 1;

/* -------------------------------------------------------------------------- */
/* Server sync (debounced)                                                    */
/* -------------------------------------------------------------------------- */

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let removeInFlight = false;

/**
 * Debounced server sync. Coalesces multiple mutations within 500ms into a
 * single PATCH /api/cart/items request (absolute quantities, no summing).
 * Removes are not debounced.
 */
function scheduleSync(syncFn: () => Promise<void>): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncFn();
  }, 500);
}

/* -------------------------------------------------------------------------- */
/* Store                                                                      */
/* -------------------------------------------------------------------------- */

const syncQueue = new Set<string>();

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hydrated: false,

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotalCents: () =>
        get().items.reduce(
          (sum, i) => sum + i.quantity * i.unitPriceCents,
          0,
        ),

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productVariantId === item.productVariantId,
          );
          if (existing) {
            const nextQty = Math.min(
              MAX_LINE_QUANTITY,
              existing.quantity + quantity,
            );
            return {
              items: state.items.map((i) =>
                i.productVariantId === item.productVariantId
                  ? { ...i, quantity: nextQty }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity }],
          };
        });
        scheduleSync(() => get().syncToServer());
      },

      removeItem: (productVariantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => i.productVariantId !== productVariantId,
          ),
        }));
        // Immediate remove on the server; do not debounce.
        if (!removeInFlight) {
          removeInFlight = true;
          fetch(`/api/cart/items/${encodeURIComponent(productVariantId)}`, {
            method: "DELETE",
          })
            .catch(() => {
              /* ignore network errors -- cart stays in client state */
            })
            .finally(() => {
              removeInFlight = false;
            });
        }
      },

      updateQuantity: (productVariantId, quantity) => {
        const clamped = Math.max(
          MIN_LINE_QUANTITY,
          Math.min(MAX_LINE_QUANTITY, Math.trunc(quantity)),
        );
        set((state) => ({
          items: state.items.map((i) =>
            i.productVariantId === productVariantId
              ? { ...i, quantity: clamped }
              : i,
          ),
        }));
        scheduleSync(() => get().syncToServer());
      },

      clearCart: () => {
        set({ items: [] });
        scheduleSync(() => get().syncToServer());
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      hydrate: () => set({ hydrated: true }),

      hydrateFromServer: async () => {
        try {
          const res = await fetch("/api/cart", { cache: "no-store" });
          if (!res.ok) return;
          const cart = (await res.json()) as ServerCartDTO;
          const serverItems = cart.items ?? [];

          const clientItems = get().items;

          if (serverItems.length === 0) {
            // Nothing on the server yet; push the client cart up if it has items.
            if (clientItems.length > 0) {
              void get().syncToServer();
            }
            return;
          }

          const serverByVariant = new Map(
            serverItems.map((s) => [s.productVariantId, s]),
          );

          // Server takes precedence for quantities; keep client items that
          // aren't on the server so they can be synced up afterwards.
          const merged: CartItem[] = clientItems.map((c) => {
            const s = serverByVariant.get(c.productVariantId);
            if (s) {
              return { ...c, quantity: s.quantity };
            }
            return c;
          });

          // Add server items that aren't in the client cart.
          const clientVariants = new Set(
            clientItems.map((c) => c.productVariantId),
          );
          for (const s of serverItems) {
            if (!clientVariants.has(s.productVariantId)) {
              merged.push({
                productVariantId: s.productVariantId,
                productId: s.productId,
                productName: s.productName,
                productSlug: s.productSlug,
                variantSize: s.variantSize || null,
                variantColor: s.variantColor,
                variantColorHex: s.variantColorHex,
                quantity: s.quantity,
                unitPriceCents: s.unitPriceCents,
                image: s.image,
              });
            }
          }

          set({ items: merged });

          // Push any client-only items up to the server so the two stay in sync.
          void get().syncToServer();
        } catch {
          /* ignore network errors -- client cart stays intact */
        }
      },

      syncToServer: async () => {
        // PATCH the full set of items with absolute quantities. The PATCH
        // endpoint upserts per variant, so the DB quantity is set to exactly
        // the client quantity (no double-counting). POST would *sum* and
        // inflate the totals on every sync.
        const items = get().items;
        for (const item of items) {
          if (syncQueue.has(item.productVariantId)) continue;
          syncQueue.add(item.productVariantId);
          try {
            await fetch("/api/cart/items", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
              }),
            });
          } catch {
            /* ignore -- will retry on next mutation */
          } finally {
            syncQueue.delete(item.productVariantId);
          }
        }
      },
    }),
    {
      name: "mediterranean-bear-cart",
      storage: createJSONStorage(() => localStorage),
      // Only persist the items, not the drawer open state or hydrated flag.
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.hydrate();
      },
    },
  ),
);
