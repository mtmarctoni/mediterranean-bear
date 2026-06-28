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
import { auth } from "@/lib/auth";
import { getOrdersByCustomerId } from "@/lib/orders/queries";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/order/status-badge";

export const dynamic = "force-dynamic";

/**
 * Account order history.
 */
export default async function AccountOrdersPage() {
  const session = await auth();
  const customerId = session?.user?.customerId ?? "";
  const orders = customerId ? await getOrdersByCustomerId(customerId) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your orders</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="space-y-2 text-sm text-text-muted">
            <p>No orders yet.</p>
            <Button size="sm" render={<Link href="/products" />}>
              Start shopping
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(o.totalCents)}
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
