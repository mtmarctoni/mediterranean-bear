import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * Admin layout. Verifies the signed-in user has role 'admin' (the proxy also
 * guards /admin/*, but we double-check here for defense in depth and to render
 * a friendly error if a non-admin somehow reaches a route).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }
  if (session.user.role !== "admin") {
    redirect("/sign-in");
  }

  const nav = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/products/sync", label: "Sync products" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Admin
        </h1>
        <p className="text-sm text-text-muted">
          Signed in as {session.user.email} (admin).
        </p>
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
        </nav>

        <div>{children}</div>
      </div>
    </main>
  );
}
