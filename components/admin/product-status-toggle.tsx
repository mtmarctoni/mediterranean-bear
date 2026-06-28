"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Toggle a product active/archived. Calls PATCH /api/admin/products/[id].
 */
export function ProductStatusToggle({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const isActive = status === "active";

  function toggle() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: isActive ? "archived" : "active",
          }),
        });
        if (!res.ok) {
          toast.error("Could not update product");
          return;
        }
        toast.success(isActive ? "Product archived" : "Product activated");
        window.location.reload();
      } catch {
        toast.error("Network error");
      }
    });
  }

  return (
    <Button
      size="sm"
      variant={isActive ? "outline" : "default"}
      disabled={pending}
      onClick={toggle}
    >
      {pending ? "..." : isActive ? "Archive" : "Activate"}
    </Button>
  );
}
