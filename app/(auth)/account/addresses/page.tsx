import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewAddressForm } from "@/components/account/new-address-form";
import { DeleteAddressButton } from "@/components/account/delete-address-button";

export const dynamic = "force-dynamic";

/**
 * Saved addresses (CRUD). MVP allows creating and deleting; editing reuses the
 * create + delete flow. Country fixed to ES.
 */
export default async function AddressesPage() {
  const session = await auth();
  const customerId = session?.user?.customerId ?? "";
  const rows = customerId
    ? await db
        .select()
        .from(addresses)
        .where(eq(addresses.customer_id, customerId))
        .orderBy(addresses.created_at)
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Saved addresses</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-text-muted">No saved addresses yet.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="text-sm text-foreground">
                    <p className="font-medium">
                      {a.first_name} {a.last_name}
                    </p>
                    <p>{a.line1}</p>
                    {a.line2 && <p>{a.line2}</p>}
                    <p>
                      {a.zip} {a.city}, {a.country_code}
                    </p>
                    {a.phone && <p className="text-text-muted">{a.phone}</p>}
                  </div>
                  <DeleteAddressButton id={a.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a new address</CardTitle>
        </CardHeader>
        <CardContent>
          <NewAddressForm />
        </CardContent>
      </Card>
    </div>
  );
}
