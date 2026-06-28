import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllOrders, type OrderStatus } from "@/lib/orders/queries";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/order/status-badge";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

const STATUS_FILTERS: (OrderStatus | "all")[] = [
  "all",
  "pending_payment",
  "confirmed",
  "submitted",
  "in_progress",
  "on_hold",
  "shipped",
  "delivered",
  "refunded",
  "cancelled",
  "failed",
];

/**
 * Admin orders table. Filterable by status via ?status=.
 */
export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const statusParam = sp.status;
  const status =
    statusParam && STATUS_FILTERS.includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : null;

  const { items, total } = await getAllOrders({
    status,
    limit: 100,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Orders ({total})</CardTitle>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={s === "all" ? "/admin/orders" : `/admin/orders?status=${s}`}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                (s === "all" && !status) || s === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-foreground hover:bg-border"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">No orders match this filter.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-text-muted">{o.email}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(o.totalCents)}
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {new Date(o.createdAt).toLocaleDateString()}
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
