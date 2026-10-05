"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export default function ChangePasswordTokenPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reset",
        token,
        password: fd.get("password"),
        password_confirmation: fd.get("password_confirmation"),
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) {
      router.push("/login?reset=1");
    } else {
      setMsg(json.message ?? "Reset failed");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md flex-1 px-4 py-10">
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="New password (min 8 characters)"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            name="password_confirmation"
            type="password"
            required
            minLength={8}
            placeholder="Confirm password"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Reset password"}
          </Button>
        </form>
        {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
        <Link href="/login" className="mt-4 block text-sm underline">
          Sign in
        </Link>
      </div>
    </AppShell>
  );
}
