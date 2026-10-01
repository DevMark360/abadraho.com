"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { AdminBackLink, adminCard } from "@/components/admin/admin-ui";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PASSWORD_TIPS = [
  "Use at least 8 characters",
  "Include letters and numbers",
  "Do not reuse your current password",
] as const;

function PasswordFormField({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
      {children}
    </div>
  );
}

function PasswordInput({
  id,
  name,
  autoComplete,
  minLength,
}: {
  id: string;
  name: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        layout="inline"
        required
        autoComplete={autoComplete}
        minLength={minLength}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function AdminChangePasswordClient({ embedded = false }: { embedded?: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const oldId = useId();
  const newId = useId();
  const confirmId = useId();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    const oldPassword = String(fd.get("oldPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setSaving(false);
      setOk(false);
      setMsg("New password and confirmation do not match.");
      return;
    }

    if (oldPassword === newPassword) {
      setSaving(false);
      setOk(false);
      setMsg("New password must be different from your current password.");
      return;
    }

    const res = await fetch("/api/admin/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });
    const j = await res.json();
    setSaving(false);
    const success = Boolean(j.success ?? j.status);
    setOk(success);
    setMsg(j.message ?? (success ? "Password updated successfully." : "Update failed"));
    if (success) e.currentTarget.reset();
  }

  return (
    <div className={cn(embedded ? "" : "mx-auto max-w-2xl space-y-5")}>
      {!embedded ? <AdminBackLink href="/admin/admin-profile">Edit profile</AdminBackLink> : null}

      {!embedded ? (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="h-20 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-700" aria-hidden />
          <div className="flex items-end gap-4 px-5 pb-5 sm:px-6">
            <div className="-mt-8 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-zinc-900 text-white shadow-md">
              <KeyRound className="h-7 w-7" aria-hidden />
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Change password</h2>
              <p className="mt-0.5 text-sm text-zinc-600">
                Keep your workspace account secure with a strong password.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-5">
        <div className={cn(adminCard, "p-5 sm:p-6")}>
          <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <PasswordFormField
                id={oldId}
                label="Current password"
                hint="Enter the password you use to sign in today."
              >
                <PasswordInput id={oldId} name="oldPassword" autoComplete="current-password" />
              </PasswordFormField>

              <PasswordFormField
                id={newId}
                label="New password"
                hint="Must be at least 8 characters."
              >
                <PasswordInput
                  id={newId}
                  name="newPassword"
                  autoComplete="new-password"
                  minLength={8}
                />
              </PasswordFormField>

              <PasswordFormField
                id={confirmId}
                label="Confirm new password"
                hint="Re-enter your new password to confirm."
              >
                <PasswordInput
                  id={confirmId}
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                />
              </PasswordFormField>
            </div>

            <aside className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 lg:mt-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
                Password tips
              </div>
              <ul className="mt-3 space-y-2.5">
                {PASSWORD_TIPS.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-zinc-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                    {tip}
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          {msg ? (
            <div className="mt-5">
              <AuthFormMessage variant={ok ? "success" : "error"}>{msg}</AuthFormMessage>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            {!embedded ? (
              <Link
                href="/admin/dashboard"
                className="text-sm text-zinc-500 transition hover:text-zinc-800"
              >
                ← Back to dashboard
              </Link>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={saving} className="w-full sm:w-auto sm:min-w-[160px]">
              {saving ? "Updating…" : "Update password"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
