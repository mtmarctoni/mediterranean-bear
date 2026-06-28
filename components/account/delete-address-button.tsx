"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteAddressAction } from "@/app/(auth)/account/addresses/actions";

/**
 * Delete button for a saved address. Uses a transition so the list updates
 * after the server action revalidates the page.
 */
export function DeleteAddressButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete address"
      disabled={pending}
      onClick={() => startTransition(() => void deleteAddressAction(id))}
    >
      <Trash2 />
    </Button>
  );
}
