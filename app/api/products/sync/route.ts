import { syncProductsFromPrintful } from "@/lib/products/sync";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
/** Sync can take a while; allow up to 60s. */
export const maxDuration = 60;

/**
 * POST /api/products/sync
 *
 * Syncs known Printful store products into our DB (see plans/002).
 * Admin only -- protected by the requireAdmin helper (role === 'admin').
 */
export async function POST() {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response!;

  try {
    const result = await syncProductsFromPrintful();
    return Response.json(result, {
      status: result.errors.length > 0 ? 207 : 200,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown sync error";
    return Response.json({ error: message }, { status: 400 });
  }
}
