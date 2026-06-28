import { getShippingQuote } from "@/lib/shipping/quote";

export const dynamic = "force-dynamic";

interface QuoteBody {
  items?: { variantId?: unknown; quantity?: unknown }[];
  address?: {
    line1?: unknown;
    line2?: unknown;
    city?: unknown;
    state_code?: unknown;
    country_code?: unknown;
    zip?: unknown;
  };
}

/**
 * POST /api/shipping/quote
 *
 * Body: { items: [{ variantId, quantity }], address: { line1, city, state_code, country_code, zip } }
 *
 * Calls Printful POST /v2/shipping/rates and returns the cheapest retail rate.
 * Falls back to DEFAULT_SHIPPING_FLAT_RATE_CENTS when Printful is unavailable.
 *
 * This route is used for the checkout-page *estimate*. The authoritative
 * shipping charge is re-computed server-side in /api/stripe/checkout (which
 * ignores any client-supplied amount). See plans/013-shipping-taxes.md.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as QuoteBody | null;
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return Response.json(
      { error: "items (non-empty) are required" },
      { status: 400 },
    );
  }
  const addr = body.address ?? {};
  if (
    typeof addr.line1 !== "string" ||
    typeof addr.city !== "string" ||
    typeof addr.zip !== "string" ||
    typeof addr.country_code !== "string"
  ) {
    return Response.json(
      { error: "address (line1, city, zip, country_code) is required" },
      { status: 400 },
    );
  }

  // Map cart items to Printful variant ids + quantities. The caller sends our
  // internal variant UUIDs, but Printful needs the catalog variant id. The
  // client should send the Printful variant id directly; for safety we accept
  // numbers and reject non-numeric strings.
  const items = body.items
    .map((i) => {
      const variantId =
        typeof i.variantId === "number"
          ? i.variantId
          : typeof i.variantId === "string"
            ? Number.parseInt(i.variantId, 10)
            : NaN;
      const quantity =
        typeof i.quantity === "number"
          ? i.quantity
          : Number.parseInt(String(i.quantity ?? ""), 10);
      if (!Number.isFinite(variantId) || !Number.isFinite(quantity) || quantity < 1) {
        return null;
      }
      return { variantId, quantity };
    })
    .filter((i): i is { variantId: number; quantity: number } => i !== null);

  if (items.length === 0) {
    return Response.json(
      { error: "items must include numeric variantId and quantity" },
      { status: 400 },
    );
  }

  const quote = await getShippingQuote(items, {
    line1: String(addr.line1),
    city: String(addr.city),
    stateCode: typeof addr.state_code === "string" ? addr.state_code : undefined,
    zip: String(addr.zip),
    countryCode: String(addr.country_code),
  });

  return Response.json({
    rateCents: quote.retailRateCents,
    retailRateCents: quote.retailRateCents,
    currency: "EUR",
    minBusinessDays: quote.fallback ? 2 : null,
    maxBusinessDays: quote.fallback ? 7 : null,
    note: "Final shipping calculated at checkout",
    fallback: quote.fallback,
  });
}
