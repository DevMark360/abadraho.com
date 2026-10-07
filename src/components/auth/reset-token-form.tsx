"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { inputInlineClass } from "@/lib/form-styles";
import { PASSWORD_MAX_LENGTH } from "@/lib/password-policy";
import { cn } from "@/lib/utils";

/** "Set a new password" form opened from the reset email link. */
export function ResetTokenForm({ token }: { token: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirm, setConfirm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  function currentPassword(): string {
    const field = formRef.current?.elements.namedItem("password") as HTMLInputElement | null;
    return field?.value ?? "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = currentPassword();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", token, password, password_confirmation: confirm }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (json.success) {
        router.push("/login?reset=1");
        return;
      }
      const message = json.message ?? "Could not reset your password. Please try again.";
      setExpired(/invalid|expired/i.test(message));
      setError(message);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormCard
      title="Choose a new password"
      subtitle="Use a strong password you don't use on other sites."
      logoHref={null}
    >
      <form ref={formRef} onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">New password</span>
          <PasswordField name="password" placeholder="New password" />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">Confirm new password</span>
          <div className="relative">
            <input
              name="password_confirmation"
              type={showConfirm ? "text" : "password"}
              required
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              placeholder="Type it again"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (mismatch) setMismatch(e.target.value !== currentPassword());
              }}
              onBlur={() => setMismatch(Boolean(confirm) && confirm !== currentPassword())}
              aria-invalid={mismatch || undefined}
              className={cn(inputInlineClass, "pr-11", mismatch && "border-red-300")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 hover:text-zinc-700"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {mismatch ? <span className="mt-1.5 block text-xs text-red-600">Passwords don&apos;t match.</span> : null}
        </label>

        {error ? (
          <AuthFormMessage variant="error">
            {error}
            {expired ? (
              <>
                {" "}
                <Link href="/reset-password" className="font-semibold underline">
                  Get a new link
                </Link>
              </>
            ) : null}
          </AuthFormMessage>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Reset password"}
        </Button>
      </form>

      <div className="mt-6 border-t border-zinc-100 pt-4">
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to sign in
        </Link>
      </div>
    </AuthFormCard>
  );
}
