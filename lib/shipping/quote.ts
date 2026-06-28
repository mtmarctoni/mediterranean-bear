/**
 * Shared shipping-quote helper.
 *
 * Calls Printful's `POST /v2/shipping/rates` and returns the cheapest retail
 * rate in cents. Falls back to `DEFAULT_SHIPPING_FLAT_RATE_CENTS` when
 * Printful is unavailable or returns no rates.
 *
 * Used by both the public shipping quote route (`/api/shipping/quote`, for the
 * checkout-page estimate) and the checkout creation route
 * (`/api/stripe/checkout`, for the authoritative server-side charge). The
 * checkout route MUST re-query Printful server-side rather than trust a
 * client-supplied amount -- otherwise a malicious client can request free
 * shipping. See plans/013-shipping-taxes.md.
 */
import { parsePriceToCents, printful } from "@/lib/printful";

export interface ShippingQuoteItem {
  /** Printful catalog/store variant id. */
  variantId: number;
  quantity: number;
}

export interface ShippingQuoteAddress {
  line1: string;
  line2?: string;
  city: string;
  stateCode?: string;
  zip: string;
  countryCode: string;
}

export interface ShippingQuoteResult {
  /** Cheapest retail rate, in cents. */
  retailRateCents: number;
  /** True when the value is the flat-rate fallback, not a live Printful quote. */
  fallback: boolean;
}

/**
 * Default flat-rate shipping (cents) used when the Printful API is unavailable.
 * Reads `DEFAULT_SHIPPING_FLAT_RATE_CENTS` from env, defaulting to 595 (EUR 5.95).
 */
export function defaultFlatRateCents(): number {
  const raw = Number.parseInt(
    process.env.DEFAULT_SHIPPING_FLAT_RATE_CENTS ?? "",
    10,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 595;
}

/**
 * Get the cheapest shipping retail rate (in cents) for a set of items shipped
 * to an address. Returns the flat-rate fallback on any Printful failure.
 */
export async function getShippingQuote(
  items: ShippingQuoteItem[],
  address: ShippingQuoteAddress,
): Promise<ShippingQuoteResult> {
  const fallback = defaultFlatRateCents();

  if (items.length === 0 || !printful.isConfigured()) {
    return { retailRateCents: fallback, fallback: true };
  }

  try {
    const rates = await printful.getShippingRates({
      recipient: {
        address1: address.line1,
        city: address.city,
        state_code: address.stateCode,
        country: address.countryCode,
        zip: address.zip,
      },
      items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      currency: "EUR",
    });

    // Pick the cheapest by retail_rate (fall back to rate).
    const sorted = [...rates].sort((a, b) => {
      const aCents = parsePriceToCents(a.retail_rate ?? a.rate);
      const bCents = parsePriceToCents(b.retail_rate ?? b.rate);
      return aCents - bCents;
    });
    const best = sorted[0];
    if (best) {
      return {
        retailRateCents: parsePriceToCents(best.retail_rate ?? best.rate),
        fallback: false,
      };
    }
  } catch (err) {
    console.error("[shipping] Printful quote failed, using fallback:", err);
  }

  return { retailRateCents: fallback, fallback: true };
}
