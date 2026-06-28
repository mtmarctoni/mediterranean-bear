import Link from "next/link";

import { auth } from "@/lib/auth";
import { signOutAction } from "@/app/(auth)/actions";

/**
 * Account layout. Renders a sidebar with account navigation and shows the
 * signed-in customer's name. All routes under /account are protected by the
 * proxy (lib/auth.ts authorized callback).
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "Account";

  const nav = [
    { href: "/account", label: "Dashboard" },
    { href: "/account/orders", label: "Orders" },
    { href: "/account/addresses", label: "Addresses" },
    { href: "/account/settings", label: "Settings" },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Hello, {name}
        </h1>
        <p className="text-sm text-text-muted">Manage your account and orders.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              {item.label}
            </Link>
          ))}
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger/10"
            >
              Sign out
            </button>
          </form>
        </nav>

        <div>{children}</div>
      </div>
    </main>
  );
}
