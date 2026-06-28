import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Database client.
 *
 * Uses Neon's serverless HTTP driver (neon-http), which is ideal for Next.js
 * App Router server components and route handlers running on edge/nodeless
 * runtimes (e.g. Vercel). A single SQL-over-HTTP query opens no persistent
 * connection, so it scales cleanly with serverless.
 *
 * The DATABASE_URL must be a Neon pooled connection string
 * (e.g. postgres://user:pass@host/db?sslmode=require).
 *
 * The client is created lazily so that importing this module does not throw at
 * build time when DATABASE_URL is not set. Queries will throw a clear error
 * instead, only when actually executed without the env var.
 */

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment variables (see .env.example).",
    );
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

/**
 * Lazy db proxy. The underlying Drizzle client is created on first property
 * access, so route handlers can be imported at build time without DATABASE_URL
 * being set. An actual query will trigger creation and surface the error.
 */
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    const instance = getDb();
    // @ts-expect-error -- proxy forwards arbitrary property access
    return instance[prop];
  },
});

let cached: ReturnType<typeof createDb> | null = null;
function getDb(): ReturnType<typeof createDb> {
  if (!cached) cached = createDb();
  return cached;
}

export { schema };
