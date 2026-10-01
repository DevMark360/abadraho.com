"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthFormCard, AuthFormFooterLink } from "@/components/auth/auth-form-card";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminRegisterClient() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<{ variant: "error" | "success" | "info"; text: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/auth/register")
      .then((r) => r.json())
      .then((j) => setEnabled(Boolean(j.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    const j = await res.json();
    setSaving(false);
    const text = j.message ?? (j.success ? "Account created" : "Registration failed");
    setMsg({
      variant: j.success ? "success" : "error",
      text,
    });
    if (j.success) {
      setTimeout(() => router.push("/admin/login"), 1500);
    }
  }

  if (enabled === null) {
    return <AuthFormSkeleton />;
  }

  return (
    <AuthFormCard
      title="Staff setup"
      subtitle="Create the first admin account (dev / staging)"
      logoHref={null}
      footer={<AuthFormFooterLink href="/admin/login">← Back to sign in</AuthFormFooterLink>}
    >
      {enabled === false && (
        <AuthFormMessage variant="info" className="mt-6">
          Registration is disabled. Set <code className="rounded bg-amber-100/80 px-1">ALLOW_ADMIN_REGISTER=true</code> in{" "}
          <code className="rounded bg-amber-100/80 px-1">.env</code> to enable.
        </AuthFormMessage>
      )}

      {enabled && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <AuthField label="Name">
            <Input layout="field" name="name" required autoComplete="name" />
          </AuthField>
          <AuthField label="Email">
            <Input layout="field" name="email" type="email" required autoComplete="email" />
          </AuthField>
          <AuthField label="Password">
            <Input
              layout="field"
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </AuthField>
          {msg ? <AuthFormMessage variant={msg.variant}>{msg.text}</AuthFormMessage> : null}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Creating…" : "Create account"}
          </Button>
        </form>
      )}
    </AuthFormCard>
  );
}
