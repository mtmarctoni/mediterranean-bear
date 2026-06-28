/**
 * Order number generation.
 *
 * Human-readable order numbers in the form `MB-XXXXXX` where XXXXXX is 6
 * uppercase alphanumeric characters (excluding ambiguous chars 0/O/1/I).
 *
 * See plans/007-order-lifecycle-admin.md.
 */
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Alphabet without ambiguous characters (0/O/1/I). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 6;
const MAX_ATTEMPTS = 10;

function randomSegment(): string {
  let out = "";
  const bytes = new Uint32Array(LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/**
 * Generate a unique `MB-XXXXXX` order number, retrying on (very unlikely)
 * collisions with existing rows.
 */
export async function generateOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = `MB-${randomSegment()}`;
    const clash = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.order_number, candidate))
      .limit(1);
    if (clash.length === 0) return candidate;
  }
  // Exhausted retries -- fall back to a longer random suffix.
  return `MB-${randomSegment()}${randomSegment().slice(0, 2)}`;
}
