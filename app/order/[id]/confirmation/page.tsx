import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import { getOrderById } from "@/lib/orders/queries";
import { OrderStatusBadge } from "@/components/order/status-badge";

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
      ? `Order ${order.orderNumber} confirmed | Mediterranean Bear`
      : "Order not found",
  };
}

/**
 * Confirmation page shown after a successful Stripe payment (success_url).
 * Thanks the customer, shows the order summary, and notes the email
 * confirmation. See plans/007.
 */
export default async function ConfirmationPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Thank you for your order
        </h1>
        <p className="text-sm text-text-muted">
          Your order <strong className="text-foreground">{order.orderNumber}</strong>{" "}
          has been confirmed.
        </p>
        <OrderStatusBadge status={order.status} />
        <p className="max-w-md text-sm text-text-muted">
          We&apos;ve sent a confirmation email to {order.email}. You&apos;ll
          receive a shipping notification with tracking once your order ships.
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <p className="font-medium text-foreground">{item.productName}</p>
                <p className="text-xs text-text-muted">
                  {item.variantColor}
                  {item.variantSize ? ` - Size ${item.variantSize}` : ""} - Qty{" "}
                  {item.quantity}
                </p>
              </div>
              <p className="font-medium text-foreground">
                {formatPrice(item.unitPriceCents * item.quantity)}
              </p>
            </div>
          ))}

          <Separator />

          <Row label="Subtotal" value={formatPrice(order.subtotalCents)} />
          <Row label="Shipping" value={formatPrice(order.shippingCents)} />
          <Row label="Tax" value={formatPrice(order.taxCents)} />
          <Separator />
          <Row label="Total" value={formatPrice(order.totalCents)} bold />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Shipping to</CardTitle>
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

      <p className="mt-6 text-center text-sm text-text-muted">
        Estimated delivery: 2-7 business days.
      </p>

      <div className="mt-6 flex justify-center gap-2">
        <Button variant="outline" render={<Link href={`/order/${order.id}`} />}>
          View order details
        </Button>
        <Button render={<Link href="/products" />}>Continue shopping</Button>
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
