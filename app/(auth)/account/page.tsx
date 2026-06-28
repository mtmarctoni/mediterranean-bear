import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getOrdersByCustomerId } from "@/lib/orders/queries";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/order/status-badge";

export const dynamic = "force-dynamic";

/**
 * Account dashboard: welcome, recent orders summary, profile summary.
 */
export default async function AccountPage() {
  const session = await auth();
  const customerId = session?.user?.customerId ?? "";
  const orders = customerId ? await getOrdersByCustomerId(customerId) : [];
  const recent = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="space-y-2 text-sm text-text-muted">
              <p>You haven&apos;t placed any orders yet.</p>
              <Button size="sm" render={<Link href="/products" />}>
                Start shopping
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {recent.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <p className="text-xs text-text-muted">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <span className="text-sm font-medium text-foreground">
                    {formatPrice(o.totalCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-foreground">{session?.user?.name ?? "(no name set)"}</p>
          <p className="text-text-muted">{session?.user?.email}</p>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/account/settings" />}
            className="mt-2"
          >
            Edit profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
