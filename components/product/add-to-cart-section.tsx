"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductGallery } from "@/components/product/product-gallery";
import { VariantSelector } from "@/components/product/variant-selector";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart/store";
import type { ProductDetail, ProductVariantDTO } from "@/lib/products/queries";

interface AddToCartSectionProps {
  product: ProductDetail;
}

/**
 * The interactive part of the product detail page: gallery, variant
 * selection, price, add-to-cart button, and a size guide dialog.
 */
export function AddToCartSection({ product }: AddToCartSectionProps) {
  const [selected, setSelected] = useState<ProductVariantDTO | null>(null);
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);

  const price = selected?.priceCents ?? product.basePriceCents;
  const hasVariants = product.variants.length > 0;
  const isApparel = hasVariants && product.variants.some((v) => v.size);

  function handleAdd() {
    if (!selected) {
      // If there's exactly one active variant (e.g. mugs), use it; otherwise prompt.
      const active = product.variants.filter((v) => v.status === "active");
      if (active.length === 1) {
        const v = active[0]!;
        addItem({
          productVariantId: v.id,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          variantSize: v.size || null,
          variantColor: v.color,
          variantColorHex: v.colorHex,
          unitPriceCents: v.priceCents,
          image: product.images[0] ?? "",
        });
        toast.success("Added to cart");
        openCart();
        return;
      }
      toast.error("Please select a size and color");
      return;
    }

    addItem({
      productVariantId: selected.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantSize: selected.size || null,
      variantColor: selected.color,
      variantColorHex: selected.colorHex,
      unitPriceCents: selected.priceCents,
      image: product.images[0] ?? "",
    });
    toast.success("Added to cart");
    openCart();
  }

  return (
    <div className="space-y-6">
      <div className="lg:hidden">
        <ProductGallery images={product.images} alt={product.name} />
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {product.name}
        </h1>
        <p className="text-xl font-medium text-primary">
          {formatPrice(price)}
        </p>
        {product.description && (
          <p className="text-sm text-text-muted">{product.description}</p>
        )}
      </div>

      <VariantSelector variants={product.variants} onSelect={setSelected} />

      <div className="flex items-center gap-3">
        <Button size="lg" className="flex-1" onClick={handleAdd}>
          Add to cart
        </Button>

        {isApparel && <SizeGuideDialog />}
      </div>
    </div>
  );
}

/**
 * Size guide dialog with a static apparel size chart placeholder.
 * TODO: Replace with Printful-provided sizing once available.
 */
function SizeGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="lg">
            Size guide
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Size guide</DialogTitle>
          <DialogDescription>
            Apparel measurements (cm). All values are approximate.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="py-2 pr-4 font-medium">Size</th>
                <th className="py-2 pr-4 font-medium">Chest</th>
                <th className="py-2 pr-4 font-medium">Length</th>
                <th className="py-2 font-medium">Sleeve</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["S", 46, 71, 21],
                ["M", 51, 73, 22],
                ["L", 56, 76, 23],
                ["XL", 61, 78, 24],
                ["2XL", 66, 81, 25],
              ].map(([size, chest, length, sleeve]) => (
                <tr key={size} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium">{size}</td>
                  <td className="py-2 pr-4">{chest}</td>
                  <td className="py-2 pr-4">{length}</td>
                  <td className="py-2">{sleeve}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
