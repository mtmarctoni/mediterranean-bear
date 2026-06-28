"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  updateProfileAction,
  changePasswordAction,
} from "@/app/(auth)/account/settings/actions";

/**
 * Settings: update name/email and change password. Two separate forms each
 * with its own server action.
 */
export function SettingsForms({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  return (
    <div className="space-y-6">
      <ProfileForm initialName={initialName} initialEmail={initialEmail} />
      <PasswordForm />
    </div>
  );
}

function ProfileForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const [state, formAction, pending] = useActionState<
    { error?: string; ok?: boolean } | null,
    FormData
  >(updateProfileAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <Input id="name" name="name" defaultValue={initialName} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initialEmail}
              required
            />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}
          {state?.ok && !state.error && (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              Profile updated.
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordForm() {
  const [state, formAction, pending] = useActionState<
    { error?: string; ok?: boolean } | null,
    FormData
  >(changePasswordAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="current_password"
              className="text-sm font-medium text-foreground"
            >
              Current password
            </label>
            <Input
              id="current_password"
              name="current_password"
              type="password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="new_password"
              className="text-sm font-medium text-foreground"
            >
              New password
            </label>
            <Input
              id="new_password"
              name="new_password"
              type="password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="confirm_password"
              className="text-sm font-medium text-foreground"
            >
              Confirm new password
            </label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              minLength={8}
              required
            />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}
          {state?.ok && !state.error && (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              Password updated.
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Updating..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
