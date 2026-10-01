"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFormCard, AuthFormFooterLink } from "@/components/auth/auth-form-card";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { SignInFields } from "@/components/auth/sign-in-fields";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api-fetch";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await apiFetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (res.ok && json.success) {
      router.push("/admin/dashboard");
      router.refresh();
    } else {
      setError(json.message ?? "Sign-in failed. Please try again.");
    }
  }

  return (
    <AuthFormCard
      title="Workspace sign in"
      subtitle="For builders and staff"
      logoHref={null}
      footer={
        <>
          <AuthFormFooterLink href="/login">Member sign in →</AuthFormFooterLink>
          <AuthFormFooterLink href="/projects">← Browse listings</AuthFormFooterLink>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <SignInFields emailPlaceholder="Work email" passwordPlaceholder="Password" />
        {error ? <AuthFormMessage variant="error">{error}</AuthFormMessage> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-zinc-500">
        <Link href="/admin/register" className="hover:text-zinc-800 hover:underline">
          First-time staff setup
        </Link>
      </p>
    </AuthFormCard>
  );
}
