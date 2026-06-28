"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/format";

/**
 * Admin actions for a single order: retry Printful submission, refund via
 * Stripe, cancel. Each opens a confirmation dialog and calls the matching
 * admin API route.
 */
export function AdminOrderActions({
  orderId,
  status,
  totalCents,
  hasPaymentIntent,
}: {
  orderId: string;
  status: string;
  totalCents: number;
  hasPaymentIntent: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const canRetry = status === "failed" || status === "confirmed";
  const canRefund =
    hasPaymentIntent &&
    status !== "refunded" &&
    status !== "cancelled" &&
    status !== "pending_payment";
  const canCancel = status === "pending_payment" || status === "confirmed";

  function call(route: string, method: "POST" = "POST") {
    startTransition(async () => {
      try {
        const res = await fetch(route, { method });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) {
          toast.error(data.error ?? "Action failed");
          return;
        }
        toast.success("Done");
        // Reload to reflect the new status.
        window.location.reload();
      } catch {
        toast.error("Network error");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canRetry && (
        <Button
          disabled={pending}
          onClick={() => call(`/api/admin/orders/${orderId}/retry`)}
        >
          {pending ? "Working..." : "Retry Printful submission"}
        </Button>
      )}

      {canRefund && (
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="destructive" disabled={pending}>
                Refund {formatPrice(totalCents)}
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Refund this order?</DialogTitle>
              <DialogDescription>
                This will refund {formatPrice(totalCents)} to the customer via
                Stripe. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => call(`/api/admin/orders/${orderId}/refund`)}
              >
                Yes, refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {canCancel && (
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline" disabled={pending}>
                Cancel order
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel this order?</DialogTitle>
              <DialogDescription>
                The order will be marked cancelled. If payment was captured, a
                separate refund may be needed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => call(`/api/admin/orders/${orderId}/cancel`)}
              >
                Yes, cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
