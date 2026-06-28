import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in | Mediterranean Bear",
  description: "Sign in to your Mediterranean Bear account.",
};

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-text-muted">
          Sign in to view your orders and manage your account.
        </p>
      </header>

      <div className="rounded-xl bg-surface p-6 ring-1 ring-foreground/10">
        <SignInForm />
      </div>

      <p className="text-center text-xs text-text-muted">
        By signing in you agree to our{" "}
        <Link
          href="/about"
          className="underline-offset-4 hover:underline"
        >
          terms
        </Link>
        .
      </p>
    </div>
  );
}
