/**
 * Admin API auth helper. All admin API routes call this to verify the signed-in
 * user has role 'admin'. Returns the session user or a 401/403 Response.
 *
 * See plans/005, 007.
 */
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

export interface AdminAuthResult {
  ok: boolean;
  response?: Response;
  session?: Session;
}

/** Verify the current request is from an authenticated admin. */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.user.role !== "admin") {
    return {
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}
