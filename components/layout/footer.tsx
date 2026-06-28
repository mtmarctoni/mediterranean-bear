import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
];

/**
 * Site footer. Minimal: brand, a few links, copyright.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
        <p className="text-sm font-medium text-primary">
          Mediterranean Bear
        </p>
        <nav className="flex items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-text-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-text-muted">
          &copy; {year} Mediterranean Bear
        </p>
      </div>
    </footer>
  );
}
