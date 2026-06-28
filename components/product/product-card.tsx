import Image from "next/image";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { formatPriceRange } from "@/lib/format";
import type { ProductListItem } from "@/lib/products/queries";

interface ProductCardProps {
  product: ProductListItem;
  /** Tailwind aspect for the image area. Defaults to square. */
  imageAspect?: string;
}

/**
 * Reusable product card for product grids. Shows first mockup image, name,
 * price range and color swatches. Links to the product detail page.
 */
export function ProductCard({ product, imageAspect = "aspect-square" }: ProductCardProps) {
  const href = `/products/${product.slug}`;
  const colors = product.colors.slice(0, 6);
  const extraColors = Math.max(0, product.colors.length - colors.length);
  const image = product.images[0];

  return (
    <Link href={href} className="group block focus-visible:outline-none">
      <Card className="overflow-hidden transition-shadow duration-200 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className={`relative w-full overflow-hidden bg-muted ${imageAspect}`}>
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
        </div>
        <CardContent className="space-y-1.5 p-3">
          <h3 className="line-clamp-1 text-sm font-medium text-foreground">
            {product.name}
          </h3>
          <p className="text-sm text-text-muted">
            {formatPriceRange(product.priceFromCents, product.priceToCents)}
          </p>
          {colors.length > 0 && (
            <div className="flex items-center gap-1 pt-0.5">
              {colors.map((c) => (
                <span
                  key={`${c.color}-${c.colorHex}`}
                  title={c.color}
                  className="size-3.5 rounded-full border border-border"
                  style={{ backgroundColor: c.colorHex }}
                >
                  <span className="sr-only">{c.color}</span>
                </span>
              ))}
              {extraColors > 0 && (
                <span className="text-xs text-text-muted">+{extraColors}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
