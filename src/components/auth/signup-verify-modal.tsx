"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
import { cn } from "@/lib/utils";

const RESEND_COOLDOWN_S = 30;

function displayPhone(stored: string) {
  return stored ? `+${stored}` : "your WhatsApp number";
}

/**
 * WhatsApp verification for a pending signup. Deliberately not dismissible (no close button,
 * no backdrop click, Escape does nothing): the account is only created once the code is right.
 * A wrong number can be changed here, which sends a fresh code.
 */
export function SignupVerifyModal({
  token,
  phone,
  devCode,
  onVerified,
}: {
  token: string;
  phone: string;
  devCode?: string;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(devCode ? `Dev code: ${devCode}` : null);
  const [busy, setBusy] = useState(false);
  const [currentPhone, setCurrentPhone] = useState(phone);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [editing, setEditing] = useState(false);
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  // Not dismissible: swallow Escape and lock page scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...body }),
    });
    return (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      phone?: string;
      otpDev?: string;
    };
  }

  async function verify(value = code) {
    if (value.length !== 4 || busy) return;
    setBusy(true);
    setError(null);
    const json = await call({ action: "verify", otp: value });
    setBusy(false);
    if (json.success) {
      onVerified();
      return;
    }
    setError(json.message ?? "That code is not right. Check the latest WhatsApp message.");
    setCode("");
  }

  async function resend() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setError(null);
    const json = await call({ action: "resend" });
    setBusy(false);
    if (json.success) {
      setInfo(json.otpDev ? `Dev code: ${json.otpDev}` : "New code sent to your WhatsApp.");
      setCooldown(RESEND_COOLDOWN_S);
      setCode("");
    } else setError(json.message ?? "Could not resend the code.");
  }

  async function changePhone() {
    if (!newPhone || busy) return;
    setBusy(true);
    setError(null);
    const json = await call({ action: "change-phone", phoneNumber: newPhone });
    setBusy(false);
    if (json.success) {
      setCurrentPhone(json.phone ?? newPhone);
      setEditing(false);
      setInfo(json.otpDev ? `Dev code: ${json.otpDev}` : "Code sent to your new number.");
      setCooldown(RESEND_COOLDOWN_S);
      setCode("");
    } else setError(json.message ?? "Could not use that number.");
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[1400] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-verify-title"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-white/80 bg-clay-surface p-6 shadow-clay sm:max-w-md sm:rounded-clay-lg sm:p-8"
      >
        <MessageCircle className="mx-auto h-8 w-8 text-emerald-600" aria-hidden />
        <h2 id="signup-verify-title" className="mt-3 text-center text-xl font-semibold text-zinc-900">
          Verify your WhatsApp number
        </h2>
        <p className="mt-1.5 text-center text-sm text-zinc-600">
          Enter the 4-digit code we sent to{" "}
          <span className="font-semibold text-zinc-900">{displayPhone(currentPhone)}</span>. Your
          account is created once the number is verified.
        </p>

        {editing ? (
          <div className="mt-5 space-y-3">
            <PhoneInput
              defaultValue={currentPhone}
              aria-label="New WhatsApp number"
              onChange={(c) => setNewPhone(c.ok ? c.stored : "")}
            />
            <div className="flex gap-2">
              <Button type="button" className="flex-1" disabled={!newPhone || busy} onClick={() => void changePhone()}>
                Send code
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <OtpCodeInput
              value={code}
              onChange={(c) => {
                setCode(c);
                if (error) setError(null);
              }}
              onComplete={(c) => void verify(c)}
              error={Boolean(error)}
              disabled={busy}
            />
            <Button
              type="button"
              className="mt-5 w-full"
              disabled={code.length !== 4 || busy}
              onClick={() => void verify()}
            >
              {busy ? "Checking…" : "Verify & create account"}
            </Button>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {error}
          </p>
        ) : info ? (
          <p className="mt-4 text-center text-xs text-zinc-500">{info}</p>
        ) : null}

        {!editing ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <button
              type="button"
              onClick={() => void resend()}
              disabled={cooldown > 0 || busy}
              className={cn(
                "font-medium",
                cooldown > 0 ? "cursor-default text-zinc-400" : "text-zinc-900 hover:text-brand-accent"
              )}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <span className="text-zinc-300" aria-hidden>
              |
            </span>
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setError(null);
              }}
              className="font-medium text-zinc-600 hover:text-zinc-900"
            >
              Wrong number? Change it
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
