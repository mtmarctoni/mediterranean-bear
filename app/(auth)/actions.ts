"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/lib/auth";
import {
  createCustomerWithPassword,
  CustomerExistsError,
} from "@/lib/auth/sync";

/**
 * Server action: sign in with email + password.
 *
 * On success Auth.js' `signIn` throws a redirect (NEXT_REDIRECT) which
 * propagates out of the try/catch and performs the redirect. On credential
 * failure it throws an AuthError we surface to the form.
 */
export async function signInAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/account",
    });
  } catch (err) {
    // signIn throws a redirect on success -- let it bubble up.
    if (err instanceof Error && err.name === "AuthError") {
      const message =
        err instanceof AuthError
          ? "Invalid email or password."
          : "Something went wrong. Please try again.";
      return { error: message };
    }
    throw err;
  }
  // Fallback redirect (normally unreachable because signIn redirects).
  redirect("/account");
}

/**
 * Server action: register a new customer, then sign them in.
 */
export async function signUpAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email || !password || !confirm) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }
  // Basic email shape check.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  try {
    await createCustomerWithPassword({ email, name: name || undefined, password });
  } catch (err) {
    if (err instanceof CustomerExistsError) {
      return { error: "An account with this email already exists." };
    }
    return { error: "Could not create your account. Please try again." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/account",
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AuthError") {
      return { error: "Account created, but sign-in failed. Please sign in." };
    }
    throw err;
  }
  redirect("/account");
}

/**
 * Server action: sign the current user out.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
