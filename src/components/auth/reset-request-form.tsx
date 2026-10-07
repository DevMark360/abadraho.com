"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { EmailInput } from "@/components/ui/email-input";
import { isLikelyEmail, recallLoginEmail, rememberLoginEmail } from "@/lib/client/last-login-email";

const RESEND_COOLDOWN_SECONDS = 30;

/** "Forgot password" request: email form, then a "check your inbox" state with resend. */
export function ResetRequestForm() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const signedIn = Boolean(user?.email);

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

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function send(target: string) {
    setLoading(true);
    setError("");
    setDevLink("");
    rememberLoginEmail(target);
    try {
      const res = await fetch("/api/v1/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-request", email: target }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        resetUrlDev?: string;
      };
      if (!res.ok || !json.success) {
        setError(json.message ?? "Could not send the reset link. Please try again.");
        return;
      }
      if (json.resetUrlDev) setDevLink(json.resetUrlDev);
      setSentTo(target);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const loginHref = email.trim() ? `/login?email=${encodeURIComponent(email.trim())}` : "/login";

  if (sentTo) {
    return (
      <AuthFormCard title="Check your email" logoHref={null}>
        <div className="mt-5 flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="h-8 w-8" aria-hidden />
          </span>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            If an account exists for <strong className="break-all font-semibold text-zinc-900">{sentTo}</strong>,
            we have sent a link to reset your password. The link works for 60 minutes.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Not there after a minute? Check your Spam or Promotions folder, and make sure this is the
            email you signed up with.
          </p>
        </div>

        {devLink ? (
          <AuthFormMessage variant="info" className="mt-4 break-all">
            Email could not be sent. Use this link: <a href={devLink} className="underline">{devLink}</a>
          </AuthFormMessage>
        ) : null}
        {error ? (
          <AuthFormMessage variant="error" className="mt-4">
            {error}
          </AuthFormMessage>
        ) : null}

        <div className="mt-6 space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading || cooldown > 0}
            onClick={() => void send(sentTo)}
          >
            {loading ? "Sending…" : cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend link"}
          </Button>
          {!signedIn ? (
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setError("");
                setDevLink("");
              }}
              className="block w-full py-1 text-center text-sm text-zinc-500 hover:text-zinc-800 hover:underline"
            >
              Use a different email
            </button>
          ) : null}
        </div>

        <BackToSignIn href={loginHref} />
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard
      title="Forgot your password?"
      subtitle={
        signedIn
          ? "We will email a reset link to your signed-in account."
          : "Enter the email you signed up with and we will send you a link to reset it."
      }
      logoHref={null}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(email.trim());
        }}
        className="mt-6 space-y-4"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">Email address</span>
          <EmailInput
            id="reset-email"
            name="email"
            value={email}
            onValueChange={setEmail}
            readOnly={signedIn}
            disabled={authLoading}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus={!signedIn}
          />
        </label>
        {signedIn ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            To reset a different account, sign out first. You can also change your password from{" "}
            <Link href="/account/password" className="underline hover:text-zinc-800">
              Account → Password
            </Link>
            .
          </p>
        ) : null}
        {error ? <AuthFormMessage variant="error">{error}</AuthFormMessage> : null}
        <Button type="submit" className="w-full" disabled={loading || authLoading || !email.trim()}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <BackToSignIn href={loginHref} />
    </AuthFormCard>
  );
}

function BackToSignIn({ href }: { href: string }) {
  return (
    <div className="mt-6 border-t border-zinc-100 pt-4">
      <Link
        href={href as "/login"}
        className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to sign in
      </Link>
    </div>
  );
}
