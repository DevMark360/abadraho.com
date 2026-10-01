"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isLikelyEmail, recallLoginEmail, rememberLoginEmail } from "@/lib/client/last-login-email";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "error">("ok");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      return;
    }
    const fromUrl = searchParams.get("email")?.trim() ?? "";
    if (isLikelyEmail(fromUrl)) {
      setEmail(fromUrl);
      rememberLoginEmail(fromUrl);
      return;
    }
    const remembered = recallLoginEmail();
    if (remembered) setEmail(remembered);
  }, [user?.email, searchParams]);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    if (email.trim()) rememberLoginEmail(email);
    const res = await fetch("/api/v1/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reset-request",
        email,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsgTone("error");
      setMsg(json.message ?? "Could not send reset link.");
      return;
    }
    setMsgTone("ok");
    let text = json.message ?? "If that email exists, a reset link was sent.";
    if (json.resetUrlDev) text += ` (dev: ${json.resetUrlDev})`;
    setMsg(text);
  }

  const signedIn = Boolean(user?.email);

  return (
    <AppShell>
      <div className="mx-auto max-w-md flex-1 px-4 py-10">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {signedIn
            ? "We will send a reset link to your signed-in account email."
            : "Enter your account email and we will send a reset link."}
        </p>
        {signedIn ? (
          <p className="mt-2 text-sm text-zinc-500">
            To reset a different account,{" "}
            <Link href="/login" className="underline hover:text-zinc-800">
              sign out
            </Link>{" "}
            first. While signed in, you can also change your password from{" "}
            <Link href="/account/password" className="underline hover:text-zinc-800">
              Account → Password
            </Link>
            .
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={signedIn}
            disabled={authLoading}
            placeholder="Email"
            autoComplete="email"
            className={signedIn ? "bg-zinc-50 text-zinc-700" : undefined}
          />
          <Button type="submit" disabled={loading || authLoading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        {msg ? (
          <AuthFormMessage variant={msgTone === "error" ? "error" : "success"} className="mt-3">
            {msg}
          </AuthFormMessage>
        ) : null}
        <Link href={email.trim() ? `/login?email=${encodeURIComponent(email.trim())}` : "/login"} className="mt-4 block text-sm underline">
          Back to sign in
        </Link>
      </div>
    </AppShell>
  );
}
