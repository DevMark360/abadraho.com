"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api-fetch";
import { trackActivity } from "@/lib/client/activity-log";
import { HONEYPOT_FIELD, rateLimitUserMessage } from "@/lib/form-spam";
import { authFormDefaults } from "@/lib/form-user-defaults";
import type { ProjectUnit } from "@/types/project-detail";

interface InquiryFormProps {
  projectId: number;
  units: ProjectUnit[];
}

export function InquiryForm({ projectId, units }: InquiryFormProps) {
  const { user, loading: authLoading } = useAuth();
  const defaults = useMemo(() => authFormDefaults(user), [user]);
  const [formKey, setFormKey] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const fd = new FormData(e.currentTarget);
    const unitId = Number(fd.get("unit_id")) || units[0]?.id;
    if (!unitId) {
      setStatus("error");
      setMessage("Select a unit.");
      return;
    }

    try {
      const res = await apiFetch("/api/v1/inquiries", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          address: fd.get("address") || "N/A",
          phone_number: fd.get("phone_number"),
          unit_id: unitId,
          project_id: projectId,
          message: fd.get("message"),
          [HONEYPOT_FIELD]: fd.get(HONEYPOT_FIELD),
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };

      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        setStatus("error");
        setMessage(
          json.message ??
            rateLimitUserMessage(retryAfter ? Number(retryAfter) : undefined)
        );
        return;
      }

      if (res.ok && json.success !== false) {
        setStatus("ok");
        setMessage(json.message ?? "Inquiry submitted. We will contact you soon.");
        setFormKey((k) => k + 1);
        trackActivity(
          {
            description: "Submitted an inquiry",
            objective: "project_inquiry_submitted",
            subjectType: "App\\Models\\Project",
            subjectId: projectId,
            logTable: "projects",
            properties: { unitId },
          },
          Boolean(user)
        );
        return;
      }

      setStatus("error");
      setMessage(json.message ?? "Could not submit. Try again.");
    } catch {
      setStatus("error");
      setMessage("Could not submit. Check your connection and try again.");
    }
  }

  return (
    <form
      key={`inquiry-${user?.id ?? "guest"}-${formKey}`}
      onSubmit={onSubmit}
      className="relative space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:shadow-md"
    >
      <input type="hidden" name="project_id" value={projectId} />
      {/* Honeypot — hidden from users, bots often fill it */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        defaultValue=""
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div>
        <h3 className="font-semibold text-zinc-900">Submit Your Inquiry</h3>
        {user && !authLoading ? (
          <p className="mt-1 text-xs text-zinc-500">Contact details pre-filled from your account</p>
        ) : null}
      </div>
      {units.length > 0 && (
        <div>
          <label className="text-xs font-medium text-zinc-600">Unit</label>
          <select
            name="unit_id"
            required
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            defaultValue={units[0]?.id}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title ?? u.name ?? `Unit #${u.id}`}
              </option>
            ))}
          </select>
        </div>
      )}
      <input
        name="name"
        required
        placeholder="Name"
        defaultValue={defaults.name}
        autoComplete="name"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        defaultValue={defaults.email}
        autoComplete="email"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />
      <input
        name="phone_number"
        required
        placeholder="Phone (11+ digits)"
        defaultValue={defaults.phone}
        autoComplete="tel"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />
      <input
        name="address"
        required
        placeholder="Address"
        defaultValue={defaults.address}
        autoComplete="street-address"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />
      <textarea
        name="message"
        required
        rows={3}
        placeholder="Message"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />
      <Button type="submit" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Submit inquiry"}
      </Button>
      {message ? (
        <p
          className={`text-sm ${status === "ok" ? "text-emerald-600" : "text-red-600"}`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
