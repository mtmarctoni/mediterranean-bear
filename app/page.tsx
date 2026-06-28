import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mediterraneanbear.marctonimas.com";

export const metadata: Metadata = {
  title: "Mediterranean Bear",
  description:
    "Mediterranean-inspired t-shirts and accessories, printed on demand. Designs inspired by Mallorca, the Tramuntana mountains, and the Mediterranean sea.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Mediterranean Bear",
    description:
      "Mediterranean-inspired t-shirts and accessories, printed on demand. Designs inspired by Mallorca, the Tramuntana mountains, and the Mediterranean sea.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Mediterranean Bear",
    description:
      "Mediterranean-inspired t-shirts and accessories, printed on demand.",
  },
};

/** Organization JSON-LD for the homepage (see plans/008). */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Mediterranean Bear",
  url: siteUrl,
  logo: `${siteUrl}/file.svg`,
  description:
    "Mediterranean-inspired t-shirts and accessories, printed on demand. Designs inspired by Mallorca, the Tramuntana mountains, and the Mediterranean sea.",
  address: {
    "@type": "PostalAddress",
    addressRegion: "Mallorca",
    addressCountry: "ES",
  },
};

/**
 * Homepage. Minimal hero for MVP; full marketing layout lands in a later phase.
 */
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Mediterranean Bear
        </h1>
        <p className="text-sm text-text-muted sm:text-base">
          T-shirts and accessories inspired by the Tramuntana mountains, the
          Mediterranean sea, and warm Mallorca sunsets.
        </p>
        <Button size="lg" render={<Link href="/products" />}>
          Shop products
        </Button>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
    </main>
  );
}