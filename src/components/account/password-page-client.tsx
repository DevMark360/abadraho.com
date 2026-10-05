"use client";

import { cn } from "@/lib/utils";
import { designTw } from "@/config/design-tokens";
import { useId, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AccountBackLink } from "@/components/account/account-back-link";
import {
  AccountFormCard,
  AccountFormField,
  AccountFormSection,
  AccountSignInGate,
} from "@/components/account/account-form-ui";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";

export function PasswordPageClient() {
  const { user, loading: authLoading } = useAuth();
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "error">("ok");
  const [loading, setLoading] = useState(false);

  const currentId = useId();
  const passwordId = useId();
  const confirmId = useId();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirmation = String(fd.get("password_confirmation") ?? "");

    if (password !== confirmation) {
      setLoading(false);
      setMsgTone("error");
      setMsg("New password and confirmation do not match.");
      return;
    }

    const res = await fetch("/api/v1/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        action: "change",
        currentPassword: fd.get("currentPassword"),
        password,
        password_confirmation: confirmation,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) {
      setMsgTone("ok");
      setMsg(json.message ?? "Password updated successfully.");
      e.currentTarget.reset();
    } else {
      setMsgTone("error");
      setMsg(json.message ?? "Could not update password. Check your current password and try again.");
    }
  }

  if (authLoading) {
    return <LoadingState size="md" label="Loading…" />;
  }

  if (!user) {
    return (
      <>
        <AccountBackLink />
        <div className="mt-6">
          <AccountSignInGate
            title="Sign in to change your password"
            description="You need to be logged in to update your account password."
            returnPath="/account/password"
          />
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      <AccountBackLink />

      <div className={cn(designTw.publicCard, "mt-2 flex items-start gap-3 px-5 py-5 sm:px-6")}>
        <KeyRound className="mt-1 h-5 w-5 shrink-0 text-brand-accent" aria-hidden />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Change password</h1>
          <p className="mt-0.5 text-sm text-zinc-600">
            Choose a new password for signing in to AbadRaho.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">

          <form onSubmit={onSubmit}>
            <AccountFormCard>
              <AccountFormSection title="Update password">
                <AccountFormField
                  id={currentId}
                  label="Current password"
                  hint="Enter the password you use to sign in today."
                  required
                >
                  <Input
                    id={currentId}
                    name="currentPassword"
                    type="password"
                    layout="inline"
                    autoComplete="current-password"
                    required
                  />
                </AccountFormField>

                <AccountFormField
                  id={passwordId}
                  label="New password"
                  hint="At least 8 characters. Use a mix of letters and numbers for better security."
                  required
                >
                  <Input
                    id={passwordId}
                    name="password"
                    type="password"
                    layout="inline"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </AccountFormField>

                <AccountFormField
                  id={confirmId}
                  label="Confirm new password"
                  hint="Re-enter the new password to confirm."
                  required
                >
                  <Input
                    id={confirmId}
                    name="password_confirmation"
                    type="password"
                    layout="inline"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </AccountFormField>
              </AccountFormSection>

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/account/profile"
                  className="text-sm text-zinc-500 transition hover:text-zinc-800"
                >
                  ← Back to profile
                </Link>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto sm:min-w-[160px]">
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </div>
            </AccountFormCard>
        </form>

        {msg ? (
          <div className="mt-4">
            <AuthFormMessage variant={msgTone === "error" ? "error" : "success"}>
              {msg}
            </AuthFormMessage>
        </div>
      ) : null}
        </div>

        <aside className={cn(designTw.publicCard, "space-y-3 p-5 lg:sticky lg:top-4")}>
          <h2 className="text-sm font-semibold text-zinc-900">Tips for a strong password</h2>
          <ul className="space-y-2 text-sm text-zinc-600">
            <li>Use at least 8 characters — longer is stronger.</li>
            <li>Mix words, numbers, and symbols.</li>
            <li>Don&apos;t reuse a password from another site.</li>
            <li>Change it right away if you think someone else knows it.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
