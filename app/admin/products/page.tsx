import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { formatPrice } from "@/lib/format";
import { ProductStatusToggle } from "@/components/admin/product-status-toggle";

export const dynamic = "force-dynamic";

/**
 * Admin products list with active/inactive toggle. Uses a status badge per
 * product and a toggle button that calls the admin product API.
 */
export default async function AdminProductsPage() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      basePriceCents: products.base_price_cents,
      status: products.status,
    })
    .from(products)
    .where(sql`${products.deleted_at} IS NULL`)
    .orderBy(products.name);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Products</CardTitle>
        <Button size="sm" render={<Link href="/admin/products/sync" />}>
          Sync from Printful
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">
            No products yet. Sync from Printful to populate the catalog.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Base price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/products/${p.slug}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatPrice(p.basePriceCents)}</TableCell>
                  <TableCell>
                    <span
                      className={
                        p.status === "active"
                          ? "text-sm font-medium text-success"
                          : "text-sm font-medium text-text-muted"
                      }
                    >
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <ProductStatusToggle id={p.id} status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
