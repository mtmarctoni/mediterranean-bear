/**
 * Customer sync helpers for Auth.js.
 *
 * On sign-up we create a customer row (with a bcrypt password hash). On sign-in
 * we look the customer up by email and update `last_login_at`. The internal
 * `customerId` and `role` are attached to the Auth.js token/session elsewhere
 * (see lib/auth.ts callbacks).
 *
 * See plans/005-auth-customers.md.
 */
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Bcrypt cost factor -- 10 is a reasonable default for login flows. */
const BCRYPT_COST = 10;

/** Hash a plaintext password using bcrypt. */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

/** Verify a plaintext password against a bcrypt hash. */
export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Create a new customer (sign-up). Throws if the email is already registered
 * -- callers should surface a "email already in use" error to the user.
 */
export async function createCustomerWithPassword(input: {
  email: string;
  name?: string;
  password: string;
}): Promise<{ id: string; role: "customer" | "admin" }> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  const existing = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.email, email))
    .limit(1);
  if (existing.length > 0) {
    throw new CustomerExistsError();
  }

  const [created] = await db
    .insert(customers)
    .values({
      email,
      name: input.name?.trim() || null,
      password_hash: passwordHash,
      role: "customer",
      last_login_at: new Date(),
    })
    .returning({ id: customers.id, role: customers.role });

  return { id: created!.id, role: created!.role };
}

/**
 * Look up a customer by email and verify their password. Returns the customer
 * record on success, or null if the customer is missing / password is wrong.
 *
 * On success, `last_login_at` is updated.
 */
export async function authenticateCustomer(
  email: string,
  password: string,
): Promise<{ id: string; role: "customer" | "admin"; name: string | null } | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select({
      id: customers.id,
      email: customers.email,
      name: customers.name,
      role: customers.role,
      passwordHash: customers.password_hash,
    })
    .from(customers)
    .where(eq(customers.email, normalized))
    .limit(1);

  const row = rows[0];
  if (!row || !row.passwordHash) return null;

  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return null;

  await db
    .update(customers)
    .set({ last_login_at: new Date(), updated_at: new Date() })
    .where(eq(customers.id, row.id));

  return { id: row.id, role: row.role, name: row.name };
}

/** Thrown when sign-up is attempted with an email that is already registered. */
export class CustomerExistsError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "CustomerExistsError";
  }
}
