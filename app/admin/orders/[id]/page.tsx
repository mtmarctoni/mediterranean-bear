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
import { getOrderById } from "@/lib/orders/queries";
import { formatPrice } from "@/lib/format";
import {
  OrderStatusBadge,
  statusLabel,
} from "@/components/order/status-badge";
import { AdminOrderActions } from "@/components/admin/order-actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Admin order detail: full info, status history, and action buttons
 * (retry Printful, refund, cancel). Failed orders show the error note.
 */
export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const failedNote = order.history
    .slice()
    .reverse()
    .find((h) => h.toStatus === "failed")?.note;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {order.orderNumber}
          </h2>
          <p className="text-xs text-text-muted">
            {new Date(order.createdAt).toLocaleString()} - {order.email}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.status === "failed" && failedNote && (
        <Card className="ring-danger/30">
          <CardHeader>
            <CardTitle className="text-danger">Printful submission failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-foreground">{failedNote}</p>
            <p className="text-text-muted">
              Review the address and Printful dashboard, then retry or refund.
            </p>
          </CardContent>
        </Card>
      )}

      <AdminOrderActions
        orderId={order.id}
        status={order.status}
        totalCents={order.totalCents}
        hasPaymentIntent={Boolean(order.stripePaymentIntentId)}
      />

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
            {order.shippingAddress.phone && (
              <p className="text-text-muted">{order.shippingAddress.phone}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fulfillment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row
              label="Printful order id"
              value={
                order.printfulOrderId ? String(order.printfulOrderId) : "-"
              }
            />
            <Row
              label="Stripe session"
              value={order.stripeSessionId || "-"}
            />
            <Row
              label="Payment intent"
              value={order.stripePaymentIntentId || "-"}
            />
            <Row
              label="Carrier"
              value={order.shippingCarrier ?? "-"}
            />
            <Row
              label="Tracking"
              value={order.shippingTracking ?? "-"}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {order.history.length === 0 && (
              <li className="text-sm text-text-muted">No status updates.</li>
            )}
            {order.history.map((h) => (
              <li key={h.id} className="flex gap-3 text-sm">
                <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    {statusLabel(h.toStatus as never)}
                    <span className="ml-2 text-xs font-normal text-text-muted">
                      by {h.createdBy}
                    </span>
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

      <div className="flex gap-2">
        <Button variant="outline" render={<Link href="/admin/orders" />}>
          Back to orders
        </Button>
      </div>
    </div>
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
    <div className="flex items-center justify-between gap-3">
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
