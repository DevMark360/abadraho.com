"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { logClientActivity } from "@/lib/client/activity-log";

export function VoucherButton({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName: string;
}) {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  async function generate() {
    setLoading(true);
    setCode(null);
    setError(null);
    setNeedsLogin(false);
    const res = await fetch("/api/v1/vouchers/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    const j = await res.json();
    setLoading(false);
    if (j.code) {
      setCode(j.code);
      logClientActivity(user?.id, {
        description: `Generated voucher for ${projectName}: ${j.code}`,
        objective: "voucher_generated",
        subject_id: projectId,
        subject_type: "project",
        log_table: "projects",
      });
      return;
    }
    if (j.requiresAuth) {
      setNeedsLogin(true);
      setError("Sign in to get your voucher code.");
      return;
    }
    setError(j.message ?? "No voucher available for this project.");
    logClientActivity(user?.id, {
      description: `Tried to generate voucher for ${projectName}, but none were available`,
      objective: "voucher_unavailable",
      subject_id: projectId,
      subject_type: "project",
      log_table: "projects",
    });
  }

  return (
    <div className="rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay p-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={generate}
        disabled={loading}
      >
        <Ticket className="mr-2 h-4 w-4" />
        {loading ? "Generating…" : "Generate voucher"}
      </Button>
      {code && (
        <p className="mt-2 text-center font-mono text-sm font-semibold text-lime-700">
          {code}
        </p>
      )}
      {error && (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}
      {needsLogin && (
        <Link
          href="/login"
          className="mt-2 block text-center text-xs font-medium text-zinc-700 underline"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
