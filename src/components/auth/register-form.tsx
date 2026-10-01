"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { oauthErrorMessage } from "@/lib/oauth-errors";

export function RegisterForm({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"form" | "phone">("form");
  const [msg, setMsg] = useState<{ variant: "error" | "success" | "info"; text: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const ref = searchParams.get("ref") ?? undefined;

  useEffect(() => {
    const oauthErr = oauthErrorMessage(searchParams.get("error"));
    if (oauthErr) setMsg({ variant: "error", text: oauthErr });
  }, [searchParams]);

  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: fd.get("first_name"),
        firstName: fd.get("first_name"),
        lastName: fd.get("last_name"),
        last_name: fd.get("last_name"),
        email: fd.get("email"),
        password: fd.get("password"),
        phoneNumber: fd.get("phone_number"),
        phone_number: fd.get("phone_number"),
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (res.ok && json.success) {
      setStep("phone");
      setMsg({ variant: "success", text: "Account created. Verify your WhatsApp number." });
    } else {
      setMsg({ variant: "error", text: json.message ?? "Registration failed" });
    }
  }

  async function submitPhone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit-phone",
        phoneNumber: fd.get("phone_number"),
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) {
      setMsg({
        variant: "success",
        text: "Enter the 4-digit OTP sent on WhatsApp.",
      });
    } else {
      setMsg({ variant: "error", text: json.message ?? "Failed to send OTP" });
    }
  }

  async function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", otp: fd.get("otp") }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) {
      router.push("/account/profile");
      router.refresh();
    } else {
      setMsg({ variant: "error", text: json.message ?? "Incorrect OTP. Check WhatsApp or request a new code." });
    }
  }

  async function resendOtp() {
    const res = await fetch("/api/v1/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend" }),
    });
    const json = await res.json();
    setMsg({
      variant: json.success ? "success" : "error",
      text: json.message ?? (json.success ? "OTP resent on WhatsApp." : "Could not resend WhatsApp OTP"),
    });
  }

  const body = (
    <>
      {!embedded && step === "form" && <AuthTabs active="register" />}
      {step === "form" ? (
        <>
          <p className="mb-4 text-sm text-zinc-500">
            Create a buyer account. Agents and builders are assigned by admin after signup.
          </p>
          <form onSubmit={register} className="space-y-3">
            <Input name="first_name" required placeholder="First name" autoComplete="given-name" />
            <Input name="last_name" required placeholder="Last name" autoComplete="family-name" />
            <Input name="email" type="email" required placeholder="Email" autoComplete="email" />
            <Input
              name="phone_number"
              placeholder="WhatsApp number (optional)"
              autoComplete="tel"
            />
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Password (min 8 characters)"
              autoComplete="new-password"
            />
            {msg ? <AuthFormMessage variant={msg.variant}>{msg.text}</AuthFormMessage> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>
          <OAuthButtons refPath={ref?.startsWith("/") ? ref : undefined} />
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Enter your WhatsApp mobile number. The verification code is sent on WhatsApp, not by SMS.
          </p>
          <form onSubmit={submitPhone} className="space-y-3">
            <Input
              name="phone_number"
              required
              placeholder="WhatsApp number (e.g. 03201234567)"
              autoComplete="tel"
            />
            <Button type="submit" variant="outline" className="w-full" disabled={loading}>
              Save number &amp; get WhatsApp OTP
            </Button>
          </form>
          <form onSubmit={verifyOtp} className="space-y-3">
            <Input
              name="otp"
              required
              maxLength={4}
              placeholder="4-digit OTP from WhatsApp"
              inputMode="numeric"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              Verify OTP
            </Button>
          </form>
          <button type="button" onClick={resendOtp} className="text-sm text-zinc-600 hover:underline">
            Resend WhatsApp OTP
          </button>
        </div>
      )}
      {step === "phone" && msg ? (
        <AuthFormMessage variant={msg.variant} className="mt-4">
          {msg.text}
        </AuthFormMessage>
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
