"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
} from "@/lib/auth/sync";

async function requireCustomerId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.customerId) {
    throw new Error("You must be signed in.");
  }
  return session.user.customerId;
}

/** Update the customer's name and email. */
export async function updateProfileAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  let customerId: string;
  try {
    customerId = await requireCustomerId();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not authenticated" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email." };
  }

  // Check email isn't taken by another customer.
  const clash = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.email, email))
    .limit(1);
  if (clash.length > 0 && clash[0]!.id !== customerId) {
    return { error: "That email is already in use." };
  }

  await db
    .update(customers)
    .set({ name: name || null, email, updated_at: new Date() })
    .where(eq(customers.id, customerId));

  revalidatePath("/account/settings");
  return { ok: true };
}

/** Change the customer's password (requires the current password). */
export async function changePasswordAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  let customerId: string;
  try {
    customerId = await requireCustomerId();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not authenticated" };
  }

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current || !next) {
    return { error: "All fields are required." };
  }
  if (next.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (next !== confirm) {
    return { error: "New passwords do not match." };
  }

  const rows = await db
    .select({ passwordHash: customers.password_hash })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  const row = rows[0];
  if (!row?.passwordHash) {
    return { error: "No password set on this account." };
  }
  const ok = await verifyPassword(current, row.passwordHash);
  if (!ok) {
    return { error: "Current password is incorrect." };
  }

  const newHash = await hashPassword(next);
  await db
    .update(customers)
    .set({ password_hash: newHash, updated_at: new Date() })
    .where(eq(customers.id, customerId));

  return { ok: true };
}
