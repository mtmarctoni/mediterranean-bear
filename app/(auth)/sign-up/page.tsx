import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Sign up | Mediterranean Bear",
  description: "Create your Mediterranean Bear account.",
};

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-sm text-text-muted">
          Track orders and save your shipping details.
        </p>
      </header>

      <div className="rounded-xl bg-surface p-6 ring-1 ring-foreground/10">
        <SignUpForm />
      </div>
    </div>
  );
}
