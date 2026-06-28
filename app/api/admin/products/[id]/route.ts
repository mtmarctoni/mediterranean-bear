import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  status?: unknown;
}

/**
 * PATCH /api/admin/products/[id] -- update a product's status (active/archived).
 * Body: { status: "active" | "archived" | "draft" }
 */
export async function PATCH(request: Request, { params }: PageProps) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response!;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body || typeof body.status !== "string") {
    return Response.json({ error: "status is required" }, { status: 400 });
  }
  const status = body.status;
  if (status !== "active" && status !== "archived" && status !== "draft") {
    return Response.json(
      { error: "status must be active, archived, or draft" },
      { status: 400 },
    );
  }

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (existing.length === 0) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  await db
    .update(products)
    .set({ status, updated_at: new Date() })
    .where(eq(products.id, id));

  return Response.json({ ok: true, status });
}
