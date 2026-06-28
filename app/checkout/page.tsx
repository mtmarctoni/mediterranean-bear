"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart/store";

interface ShippingQuote {
  retailRateCents: number;
  currency: string;
  minBusinessDays: number | null;
  maxBusinessDays: number | null;
  fallback: boolean;
}

/**
 * Checkout page.
 *
 * The customer enters their shipping address here (before the Stripe
 * redirect). We fetch a live shipping quote from /api/shipping/quote, show an
 * order summary, then POST to /api/stripe/checkout which returns the hosted
 * Stripe Checkout URL.
 *
 * MVP ships to Spain only, so country_code is fixed to "ES".
 */
export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotalCents());
  const hydrated = useCart((s) => s.hydrated);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    stateCode: "",
    zip: "",
    phone: "",
  });
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect to cart if empty (after hydration).
  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace("/cart");
    }
  }, [hydrated, items.length, router]);

  // Fetch a shipping quote whenever the address fields are filled.
  async function fetchQuote() {
    if (!form.line1 || !form.city || !form.zip) return;
    setQuoteLoading(true);
    try {
      const payloadItems = items.map((i) => ({
        // The shipping API accepts Printful catalog variant ids. The cart
        // stores our internal UUID; for the quote we send the unit price as a
        // fallback signal -- the server falls back to a flat rate when it
        // can't map variants. (For MVP we rely on the fallback flat rate.)
        variantId: 0,
        quantity: i.quantity,
      }));
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          address: {
            line1: form.line1,
            city: form.city,
            state_code: form.stateCode,
            country_code: "ES",
            zip: form.zip,
          },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as ShippingQuote;
        setQuote(data);
      }
    } catch {
      // ignore -- quote stays null, we'll show the fallback on submit
    } finally {
      setQuoteLoading(false);
    }
  }

  const shippingCents = quote?.retailRateCents ?? 0;
  const estimatedTaxCents = Math.round(subtotal * 0.21); // 21% IVA estimate
  const totalCents = subtotal + shippingCents + estimatedTaxCents;

  function handleBlur() {
    if (form.line1 && form.city && form.zip && items.length > 0) {
      void fetchQuote();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (!form.firstName || !form.lastName || !form.line1 || !form.city || !form.zip) {
      toast.error("Please complete all required address fields");
      return;
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!/^\d{5}$/.test(form.zip)) {
      toast.error("Spanish postal codes are 5 digits");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          shippingAddress: {
            firstName: form.firstName,
            lastName: form.lastName,
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            stateCode: form.stateCode,
            zip: form.zip,
            countryCode: "ES",
            phone: form.phone || undefined,
          },
          shippingRateCents: shippingCents,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not start checkout");
        return;
      }
      // Redirect to Stripe hosted Checkout.
      window.location.href = data.url;
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (hydrated && items.length === 0) {
    return null; // redirecting to /cart
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Checkout
        </h1>
        <p className="text-sm text-text-muted">
          We ship within Spain only. Payment is handled securely by Stripe.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Shipping address form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="First name"
                  id="firstName"
                  value={form.firstName}
                  onChange={(v) => setForm({ ...form, firstName: v })}
                  required
                />
                <Field
                  label="Last name"
                  id="lastName"
                  value={form.lastName}
                  onChange={(v) => setForm({ ...form, lastName: v })}
                  required
                />
              </div>
              <Field
                label="Email"
                id="email"
                type="email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                required
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field
                label="Address"
                id="line1"
                value={form.line1}
                onChange={(v) => setForm({ ...form, line1: v })}
                onBlur={handleBlur}
                required
              />
              <Field
                label="Apartment, suite, etc. (optional)"
                id="line2"
                value={form.line2}
                onChange={(v) => setForm({ ...form, line2: v })}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="City"
                  id="city"
                  value={form.city}
                  onChange={(v) => setForm({ ...form, city: v })}
                  onBlur={handleBlur}
                  required
                />
                <Field
                  label="Province"
                  id="stateCode"
                  value={form.stateCode}
                  onChange={(v) => setForm({ ...form, stateCode: v })}
                />
                <Field
                  label="Postal code"
                  id="zip"
                  value={form.zip}
                  onChange={(v) => setForm({ ...form, zip: v })}
                  onBlur={handleBlur}
                  required
                />
              </div>
              <Field
                label="Phone (optional)"
                id="phone"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <p className="text-xs text-text-muted">
                Country: Spain (ES). We currently ship only within Spain.
              </p>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Redirecting to Stripe..." : "Pay securely"}
          </Button>
        </form>

        {/* Order summary */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div key={item.productVariantId} className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.productName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {item.variantColor}
                      {item.variantSize ? ` - Size ${item.variantSize}` : ""} - Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {formatPrice(item.unitPriceCents * item.quantity)}
                  </p>
                </div>
              ))}

              <Separator />

              <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
              <SummaryRow
                label={
                  quoteLoading
                    ? "Shipping (calculating...)"
                    : quote
                      ? `Shipping${quote.fallback ? " (estimate)" : ""}`
                      : "Shipping (enter address)"
                }
                value={shippingCents > 0 ? formatPrice(shippingCents) : "-"}
              />
              <SummaryRow
                label="Tax (estimated, calculated at checkout)"
                value={formatPrice(estimatedTaxCents)}
              />
              <Separator />
              <SummaryRow
                label="Total"
                value={formatPrice(totalCents)}
                bold
              />
              <p className="text-xs text-text-muted">
                Final shipping and tax are confirmed on Stripe&apos;s secure
                checkout page.
              </p>
            </CardContent>
          </Card>

          <Button variant="outline" render={<Link href="/cart" />} className="w-full">
            Back to cart
          </Button>
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  onBlur,
  type = "text",
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
      />
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          bold ? "text-sm font-semibold text-foreground" : "text-sm text-text-muted"
        }
      >
        {label}
      </span>
      <span
        className={
          bold ? "text-sm font-semibold text-foreground" : "text-sm text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
