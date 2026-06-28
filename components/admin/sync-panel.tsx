"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Sync page: a button that triggers POST /api/products/sync (admin only after
 * Phase 3 locks it down). Shows the result summary inline.
 */
export function SyncPanel() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    synced?: number;
    errors?: { printfulStoreProductId: number; error: string }[];
  } | null>(null);

  async function run() {
    setPending(true);
    try {
      const res = await fetch("/api/products/sync", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        synced?: number;
        errors?: { printfulStoreProductId: number; error: string }[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Sync failed");
        return;
      }
      setResult(data);
      toast.success(`Synced ${data.synced ?? 0} products`);
    } catch {
      toast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync products from Printful</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-text-muted">
          Pulls the known Printful store products and their variants into the
          database. Run this after adding or updating products in Printful.
        </p>
        <Button onClick={run} disabled={pending}>
          {pending ? "Syncing..." : "Run sync"}
        </Button>
        {result && (
          <div className="text-sm">
            <p className="text-foreground">
              Synced {result.synced ?? 0} products.
            </p>
            {result.errors && result.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-danger">
                {result.errors.map((e) => (
                  <li key={e.printfulStoreProductId}>
                    Store product {e.printfulStoreProductId}: {e.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
