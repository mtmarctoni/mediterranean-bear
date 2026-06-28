"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAddressAction } from "@/app/(auth)/account/addresses/actions";

/**
 * Form to add a new saved address. Country is fixed to ES (MVP ships to Spain
 * only).
 */
export function NewAddressForm() {
  const [state, formAction, pending] = useActionState<
    { error?: string } | null,
    FormData
  >(createAddressAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="first_name" label="First name" required />
        <Field name="last_name" label="Last name" required />
      </div>
      <Field name="line1" label="Address" required />
      <Field name="line2" label="Apartment, suite (optional)" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field name="city" label="City" required />
        <Field name="state_code" label="Province" />
        <Field name="zip" label="Postal code" required />
      </div>
      <Field name="phone" label="Phone (optional)" />

      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Add address"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  required,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <Input id={name} name={name} required={required} />
    </div>
  );
}
