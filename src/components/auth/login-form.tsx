"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { SignInFields } from "@/components/auth/sign-in-fields";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api-fetch";
import { oauthErrorMessage } from "@/lib/oauth-errors";
import { getPostLoginRedirect } from "@/lib/post-login-redirect";
import { syncLocalWishlistToServer, loadServerWishlistIds } from "@/lib/client/wishlist-sync";
import { isLikelyEmail, recallLoginEmail, rememberLoginEmail } from "@/lib/client/last-login-email";

export function LoginForm({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const ref = searchParams.get("ref");

  useEffect(() => {
    const oauthErr = oauthErrorMessage(searchParams.get("error"));
    if (oauthErr) setError(oauthErr);
  }, [searchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get("email")?.trim() ?? "";
    if (isLikelyEmail(fromUrl)) {
      setEmail(fromUrl);
      return;
    }
    const remembered = recallLoginEmail();
    if (remembered) setEmail(remembered);
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const submittedEmail = String(fd.get("email") ?? "").trim();
    if (submittedEmail) rememberLoginEmail(submittedEmail);
    if (ref?.startsWith("/")) {
      await apiFetch("/api/v1/auth/session-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ref }),
      });
    }
    const res = await apiFetch("/api/v1/auth/login", {
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
      if (json.kind === "admin") {
        router.push(((json.redirect as string) ?? "/admin/dashboard") as "/admin/dashboard");
        router.refresh();
        return;
      }
      await syncLocalWishlistToServer();
      await loadServerWishlistIds();
      const dest = getPostLoginRedirect(json.user?.userTypeId, json.user?.role, ref);
      router.push(dest as "/");
      router.refresh();
      return;
    }
    setError(json.message ?? "Sign-in failed. Please try again.");
  }

  const body = (
    <>
      {!embedded && <AuthTabs active="signin" />}
      <form onSubmit={onSubmit} className="space-y-4">
        <SignInFields email={email} onEmailChange={setEmail} />
        {error ? <AuthFormMessage variant="error">{error}</AuthFormMessage> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="mt-4 text-center">
        <Link
          href={
            email.trim()
              ? `/reset-password?email=${encodeURIComponent(email.trim())}`
              : "/reset-password"
          }
          className="text-sm text-zinc-500 hover:text-zinc-800 hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <OAuthButtons refPath={ref?.startsWith("/") ? ref : undefined} />
    </>
  );

  if (embedded) return body;

  return (
    <AuthFormCard title="Welcome back" subtitle="Sign in to AbadRaho" logoHref="/">
      {body}
    </AuthFormCard>
  );
}
