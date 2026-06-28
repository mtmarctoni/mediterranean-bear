"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

async function requireCustomerId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.customerId) {
    throw new Error("You must be signed in.");
  }
  return session.user.customerId;
}

/**
 * Create a new saved address for the signed-in customer.
 */
export async function createAddressAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  let customerId: string;
  try {
    customerId = await requireCustomerId();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not authenticated" };
  }

  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const line1 = String(formData.get("line1") ?? "").trim();
  const line2 = String(formData.get("line2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state_code = String(formData.get("state_code") ?? "").trim();
  const zip = String(formData.get("zip") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!first_name || !last_name || !line1 || !city || !zip) {
    return { error: "Please complete all required fields." };
  }

  await db.insert(addresses).values({
    customer_id: customerId,
    first_name,
    last_name,
    line1,
    line2: line2 || null,
    city,
    state_code,
    zip,
    country_code: "ES",
    phone: phone || null,
    is_default: false,
  });

  revalidatePath("/account/addresses");
  return {};
}

/** Delete a saved address (must belong to the signed-in customer). */
export async function deleteAddressAction(id: string): Promise<void> {
  const customerId = await requireCustomerId();
  await db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.customer_id, customerId)));
  revalidatePath("/account/addresses");
}
