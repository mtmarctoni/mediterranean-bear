import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/format";
import { getOrderById } from "@/lib/orders/queries";
import { OrderStatusBadge, statusLabel } from "@/components/order/status-badge";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderById(id);
  return {
    title: order
      ? `Order ${order.orderNumber} | Mediterranean Bear`
      : "Order not found",
  };
}

/**
 * Public order detail page. Accessible by order id (the id is an unguessable
 * UUID, included in confirmation emails). Authenticated customers also reach
 * it from /account/orders.
 */
export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Order {order.orderNumber}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-sm text-text-muted">
          Placed {new Date(order.createdAt).toLocaleDateString()}
        </p>
      </header>

      {/* Progress indicator */}
      <OrderProgress status={order.status} />

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {item.productName}
                      </div>
                      <div className="text-xs text-text-muted">
                        {item.variantColor}
                        {item.variantSize ? ` - Size ${item.variantSize}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatPrice(item.unitPriceCents * item.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            <div className="space-y-1.5">
              <Row label="Subtotal" value={formatPrice(order.subtotalCents)} />
              <Row label="Shipping" value={formatPrice(order.shippingCents)} />
              <Row label="Tax" value={formatPrice(order.taxCents)} />
              <Separator />
              <Row label="Total" value={formatPrice(order.totalCents)} bold />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Shipping address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground">
              <p>
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.zip} {order.shippingAddress.city}
              </p>
              <p>{order.shippingAddress.countryCode}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tracking</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {order.shippingTracking ? (
                <div className="space-y-1">
                  <p className="text-foreground">
                    Carrier: {order.shippingCarrier ?? "carrier"}
                  </p>
                  <p className="text-foreground">
                    Tracking: {order.shippingTracking}
                  </p>
                </div>
              ) : (
                <p className="text-text-muted">
                  Tracking information will appear here once your order ships.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Status history</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {order.history.length === 0 && (
                <li className="text-sm text-text-muted">No status updates yet.</li>
              )}
              {order.history.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {statusLabel(h.toStatus as never)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(h.createdAt).toLocaleString()}
                      {h.note ? ` - ${h.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button render={<Link href="/products" />}>Continue shopping</Button>
        </div>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          bold ? "text-sm font-semibold text-foreground" : "text-sm text-text-muted"
        }
      >
        {label}
      </span>
      <span
        className={
          bold ? "text-sm font-semibold text-foreground" : "text-sm text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

/** Simple visual progress through the fulfillment lifecycle. */
function OrderProgress({ status }: { status: string }) {
  const steps = [
    "confirmed",
    "submitted",
    "in_progress",
    "shipped",
    "delivered",
  ];
  const currentIndex = steps.indexOf(status);
  if (status === "cancelled" || status === "failed" || status === "refunded") {
    return null;
  }
  if (currentIndex === -1) return null;

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-1 items-center gap-1">
          <div
            className={`h-1.5 flex-1 rounded-full ${
              i <= currentIndex ? "bg-primary" : "bg-border"
            }`}
          />
        </div>
      ))}
    </div>
  );
}
