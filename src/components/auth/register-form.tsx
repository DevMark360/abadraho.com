"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { PasswordField } from "@/components/auth/password-field";
import { SignupVerifyModal } from "@/components/auth/signup-verify-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailInput } from "@/components/ui/email-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { oauthErrorMessage } from "@/lib/oauth-errors";
import { isSafeRelativePath } from "@/lib/post-login-redirect";

type PendingSignup = { token: string; phone: string; devCode?: string };

/**
 * Signup: the form only starts a pending signup and sends a WhatsApp code. The account is
 * created when the code is verified in the (non-dismissible) verification modal.
 */
export function RegisterForm({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState<{ variant: "error" | "success" | "info"; text: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingSignup | null>(null);

  const ref = searchParams.get("ref") ?? undefined;
  const nextPath = ref && isSafeRelativePath(ref) && ref !== "/" ? ref : "/account/profile";

  useEffect(() => {
    const oauthErr = oauthErrorMessage(searchParams.get("error"));
    if (oauthErr) setMsg({ variant: "error", text: oauthErr });
  }, [searchParams]);

  async function startSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        firstName: fd.get("first_name"),
        lastName: fd.get("last_name"),
        email: fd.get("email"),
        password: fd.get("password"),
        phoneNumber: fd.get("phone_number"),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      token?: string;
      phone?: string;
      otpDev?: string;
    };
    setLoading(false);
    if (res.ok && json.success && json.token) {
      setPending({ token: json.token, phone: json.phone ?? "", devCode: json.otpDev });
    } else {
      setMsg({ variant: "error", text: json.message ?? "Could not start signup. Please try again." });
    }
  }

  const body = (
    <>
      {!embedded && <AuthTabs active="register" />}
      <p className="mb-4 text-xs leading-relaxed text-zinc-500">
        Buyer account. Agent and builder access is set up by our team after signup.
      </p>
      <form onSubmit={startSignup} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            name="first_name"
            required
            placeholder="First name"
            aria-label="First name"
            autoComplete="given-name"
          />
          <Input
            name="last_name"
            required
            placeholder="Last name"
            aria-label="Last name"
            autoComplete="family-name"
          />
        </div>
        <div>
          <EmailInput id="register-email" name="email" placeholder="Email" aria-label="Email" />
        </div>
        <PhoneInput name="phone_number" aria-label="WhatsApp number" placeholder="WhatsApp number" />
        <PasswordField name="password" placeholder="Password" />
        {msg ? <AuthFormMessage variant={msg.variant}>{msg.text}</AuthFormMessage> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending code…" : "Create account"}
        </Button>
        <p className="text-center text-xs text-zinc-500">
          We&apos;ll send a 4-digit code to your WhatsApp to verify your number.
        </p>
      </form>
      <OAuthButtons refPath={ref?.startsWith("/") ? ref : undefined} />

      {pending ? (
        <SignupVerifyModal
          token={pending.token}
          phone={pending.phone}
          devCode={pending.devCode}
          onVerified={() => {
            router.push(nextPath);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );

  if (embedded) return body;

  return (
    <AuthFormCard title="Join AbadRaho" subtitle="Create your account" logoHref="/">
      {body}
    </AuthFormCard>
  );
}
