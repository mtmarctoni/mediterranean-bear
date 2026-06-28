import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mediterraneanbear.marctonimas.com";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story behind Mediterranean Bear - a small print-on-demand brand inspired by Mallorca, the Tramuntana mountains, and the Mediterranean sea.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    title: "About | Mediterranean Bear",
    description:
      "A small print-on-demand brand inspired by Mallorca, the Tramuntana mountains, and the Mediterranean sea.",
    url: `${siteUrl}/about`,
  },
  twitter: {
    card: "summary_large_image",
    title: "About | Mediterranean Bear",
    description:
      "A small print-on-demand brand inspired by Mallorca, the Tramuntana mountains, and the Mediterranean sea.",
  },
};

/**
 * About page. Placeholder for the marketing narrative that lands in a later
 * phase -- enough so the nav link doesn't 404.
 */
export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        About
      </h1>
      <p className="mt-4 text-sm text-text-muted">
        Mediterranean Bear is a small print-on-demand brand inspired by
        Mallorca: the Tramuntana mountains, the Mediterranean sea, and the
        warm light of a summer sunset. Our designs are printed and shipped
        on demand by Printful.
      </p>
      <p className="mt-4 text-sm text-text-muted">
        Full story coming soon.
      </p>
    </main>
  );
}
