"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { PhoneInput } from "@/components/ui/phone-input";

export function PhoneVerifyPanel({
  initialPhone = "",
  onVerified,
}: {
  initialPhone?: string;
  onVerified?: () => void;
}) {
  const { refresh } = useAuth();
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submitPhone() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/v1/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        action: "submit-phone",
        phoneNumber: phone,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) {
      setSent(true);
      setMsg("OTP sent on WhatsApp. Enter the 4-digit code below.");
    } else {
      setMsg(json.message ?? "Failed to send WhatsApp OTP");
    }
  }

  async function verifyOtp() {
    setLoading(true);
    const res = await fetch("/api/v1/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "verify", otp }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) {
      setMsg("WhatsApp number verified.");
      setOtp("");
      await refresh();
      onVerified?.();
    } else {
      setMsg(json.message ?? "Incorrect OTP. Check WhatsApp or request a new code.");
    }
  }

  async function resendOtp() {
    const res = await fetch("/api/v1/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "resend" }),
    });
    const json = await res.json();
    setMsg(
      json.success
        ? (json.message ?? "OTP resent on WhatsApp.")
        : (json.message ?? "Could not resend WhatsApp OTP")
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <p className="text-sm font-medium text-zinc-900">Verify WhatsApp number</p>
      <p className="text-xs text-zinc-600">
        Use the same mobile number you use on WhatsApp. We send the code via WhatsApp, not SMS.
      </p>
      <div className="space-y-2">
        <PhoneInput
          defaultValue={initialPhone}
          aria-label="WhatsApp number"
          placeholder="WhatsApp number"
          onChange={(c) => setPhone(c.ok ? c.stored : "")}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || !phone.trim()}
          onClick={() => void submitPhone()}
        >
          Send OTP on WhatsApp
        </Button>
      </div>
      {sent && (
        <div className="space-y-2">
          <input
            name="otp"
            required
            maxLength={4}
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="4-digit OTP from WhatsApp"
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
          />
          <Button
            type="button"
            size="sm"
            disabled={loading || otp.length < 4}
            onClick={() => void verifyOtp()}
          >
            Verify OTP
          </Button>
        </div>
      )}
      {sent && (
        <button type="button" onClick={() => void resendOtp()} className="text-xs underline">
          Resend WhatsApp OTP
        </button>
      )}
      {msg && <p className="text-xs text-zinc-600">{msg}</p>}
    </div>
  );
}
