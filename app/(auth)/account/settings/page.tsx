import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { SettingsForms } from "@/components/account/settings-forms";

export const dynamic = "force-dynamic";

/**
 * Account settings: update name/email and change password.
 */
export default async function SettingsPage() {
  const session = await auth();
  const customerId = session?.user?.customerId ?? "";
  const rows = customerId
    ? await db
        .select({ name: customers.name, email: customers.email })
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1)
    : [];
  const me = rows[0];

  return (
    <SettingsForms
      initialName={me?.name ?? session?.user?.name ?? ""}
      initialEmail={me?.email ?? session?.user?.email ?? ""}
    />
  );
}
