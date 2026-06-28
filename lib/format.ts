/**
 * Money / formatting helpers for display.
 */

/**
 * Format an integer-cents amount as a EUR price string.
 * e.g. 2999 -> "€29.99"
 */
export function formatPrice(cents: number): string {
  const value = cents / 100;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/**
 * Format a price range.
 * e.g. (2999, 3199) -> "€29.99 – €31.99"; (2999, 2999) -> "€29.99"
 */
export function formatPriceRange(fromCents: number, toCents: number): string {
  if (fromCents === toCents) return formatPrice(fromCents);
  return `${formatPrice(fromCents)} – ${formatPrice(toCents)}`;
}
