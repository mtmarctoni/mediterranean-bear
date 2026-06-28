import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrderStats } from "@/lib/orders/queries";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Admin dashboard: headline stats (total orders, pending, shipped, revenue).
 */
export default async function AdminDashboardPage() {
  const stats = await getOrderStats();

  const cards = [
    { label: "Total orders", value: String(stats.total) },
    { label: "Pending / in flight", value: String(stats.pending) },
    { label: "Shipped / delivered", value: String(stats.shipped) },
    { label: "Revenue", value: formatPrice(stats.revenueCents) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-text-muted">
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
