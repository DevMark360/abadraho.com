"use client";
import { LoadingState } from "@/components/ui/loading-state";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const [msg, setMsg] = useState("Checking verification link…");
  const [devLink, setDevLink] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const id = searchParams.get("id");
    const hash = searchParams.get("hash");
    if (!id || !hash) {
      setMsg("Check your inbox for the verification link, or resend below while signed in.");
      return;
    }

    fetch(
      `/api/v1/auth/email?id=${encodeURIComponent(id)}&hash=${encodeURIComponent(hash)}`,
      { credentials: "same-origin" }
    )
      .then(async (r) => {
        const j = await r.json();
        if (j.success) {
          setVerified(true);
          setMsg("Email verified successfully.");
          await refresh();
          router.refresh();
        } else {
          setMsg(j.message ?? "Verification failed");
        }
      })
      .catch(() => setMsg("Could not verify email. Try again or resend from profile."));
  }, [searchParams, refresh, router]);

  async function resend() {
    const res = await fetch("/api/v1/auth/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "resend" }),
    });
    const json = await res.json();
    if (json.verifyUrlDev) setDevLink(json.verifyUrlDev);
    setMsg(
      json.verifyUrlDev
        ? "SMTP may be off. Use this verification link:"
        : json.message ?? (res.ok ? "Email sent" : "Sign in to resend verification")
    );
  }

  return (
    <div className="mx-auto max-w-md flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold">Verify email</h1>
      <p className="mt-4 text-sm text-zinc-600">{msg}</p>
      {devLink && (
        <p className="mt-3 break-all rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <a href={devLink} className="font-medium underline">
            {devLink}
          </a>
        </p>
      )}
      {verified ? (
        <Link href="/account/profile" className="mt-6 inline-block">
          <Button>Go to profile</Button>
        </Link>
      ) : (
        <Button type="button" className="mt-6" variant="outline" onClick={resend}>
          Resend verification email
        </Button>
      )}
      <Link href="/account/profile" className="mt-4 block text-sm underline">
        Profile
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-10"><LoadingState size="md" /></div>}>
        <VerifyEmailContent />
      </Suspense>
    </AppShell>
  );
}
