import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartSection } from "@/components/product/add-to-cart-section";
import { ProductGallery } from "@/components/product/product-gallery";
import { getProductBySlug } from "@/lib/products/queries";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Product detail page. Renders the gallery, variant selectors and add-to-cart
 * section. Includes Product JSON-LD and Open Graph metadata (per plans/008).
 */
export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  // If the database is unreachable, treat it as "not found" so the page
  // renders a 404 instead of a 500. A real missing product also hits this path.
  let product: Awaited<ReturnType<typeof getProductBySlug>> = null;
  try {
    product = await getProductBySlug(slug);
  } catch (err) {
    console.error("Failed to load product:", err);
  }
  if (!product) notFound();

  const priceFrom =
    product.variants.length > 0
      ? Math.min(...product.variants.map((v) => v.priceCents))
      : product.basePriceCents;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-xs text-text-muted" aria-label="Breadcrumb">
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        <span className="mx-1">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="hidden lg:block">
          <ProductGallery images={product.images} alt={product.name} />
        </div>

        <AddToCartSection product={product} />
      </div>

      <ProductJsonLd
        name={product.name}
        description={product.description}
        images={product.images}
        variants={product.variants}
        priceFrom={priceFrom}
      />
    </main>
  );
}

/**
 * Product structured data. Uses AggregateOffer when the product has multiple
 * active variants (so search results show a price range), falling back to a
 * single Offer otherwise. See plans/008.
 */
function ProductJsonLd({
  name,
  description,
  images,
  variants,
  priceFrom,
}: {
  name: string;
  description: string;
  images: string[];
  variants: { status: string; priceCents: number }[];
  priceFrom: number;
}) {
  const active = variants.filter((v) => v.status === "active");
  const inStock = active.length > 0;
  const prices = active.map((v) => v.priceCents);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : priceFrom;
  const highPrice = prices.length > 0 ? Math.max(...prices) : priceFrom;

  const offers =
    active.length > 1
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "EUR",
          lowPrice: (lowPrice / 100).toFixed(2),
          highPrice: (highPrice / 100).toFixed(2),
          offerCount: active.length,
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: (lowPrice / 100).toFixed(2),
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description || undefined,
    image: images,
    offers,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return {
      title: "Product not found",
      description: "The requested product could not be found.",
    };
  }
  const image = product.images[0];
  const title = product.name;
  // Truncate description to ~155 chars for meta description (see plans/008).
  const rawDescription =
    product.description || "Mediterranean-inspired t-shirts and accessories.";
  const description =
    rawDescription.length > 155
      ? `${rawDescription.slice(0, 152).trimEnd()}...`
      : rawDescription;

  return {
    title,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      // Next.js' OpenGraph type union does not model "product"; structured
      // data is provided via Product JSON-LD above, so og:type stays website.
      type: "website",
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/products/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

// Keep generateMetadata below for OG + Twitter cards.
