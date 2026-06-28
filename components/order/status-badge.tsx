import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/orders/queries";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  submitted: "Submitted",
  in_progress: "In progress",
  on_hold: "On hold",
  cancelled: "Cancelled",
  shipped: "Shipped",
  delivered: "Delivered",
  refunded: "Refunded",
  failed: "Failed",
};

const STATUS_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending_payment: "outline",
  confirmed: "default",
  submitted: "default",
  in_progress: "secondary",
  on_hold: "secondary",
  cancelled: "destructive",
  shipped: "default",
  delivered: "default",
  refunded: "outline",
  failed: "destructive",
};

/** Human-readable label for an order status. */
export function statusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** Colored Badge for an order status. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
      {statusLabel(status)}
    </Badge>
  );
}
