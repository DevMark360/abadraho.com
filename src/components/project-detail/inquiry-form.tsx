"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/client/api-fetch";
import { trackActivity } from "@/lib/client/activity-log";
import { HONEYPOT_FIELD, rateLimitUserMessage } from "@/lib/form-spam";
import { authFormDefaults } from "@/lib/form-user-defaults";
import type { ProjectUnit } from "@/types/project-detail";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-zinc-700">
        {label}
      </label>
      {children}
    </div>
  );
}

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
      className="relative space-y-3.5 rounded-clay-lg border border-white/80 bg-clay-surface p-5 shadow-clay sm:p-6"
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
        <h2 className="text-lg font-bold tracking-tight text-zinc-900">Interested in this project?</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {user && !authLoading
            ? "Your contact details are pre-filled from your account."
            : "Send your details and a Mark Properties advisor will get back to you."}
        </p>
      </div>
      {units.length > 0 && (
        <Field label="Unit" htmlFor={`inq-unit-${projectId}`}>
          <div className="relative">
            <Select
              id={`inq-unit-${projectId}`}
              name="unit_id"
              required
              defaultValue={units[0]?.id}
              className="appearance-none pr-10"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title ?? u.name ?? `Unit #${u.id}`}
                </option>
              ))}
            </Select>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden
            />
          </div>
        </Field>
      )}
      <Field label="Full name" htmlFor={`inq-name-${projectId}`}>
        <Input
          id={`inq-name-${projectId}`}
          name="name"
          required
          defaultValue={defaults.name}
          autoComplete="name"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label="Phone" htmlFor={`inq-phone-${projectId}`}>
          <Input
            id={`inq-phone-${projectId}`}
            name="phone_number"
            type="tel"
            inputMode="tel"
            required
            placeholder="03XX XXXXXXX"
            defaultValue={defaults.phone}
            autoComplete="tel"
          />
        </Field>
        <Field label="Email" htmlFor={`inq-email-${projectId}`}>
          <Input
            id={`inq-email-${projectId}`}
            name="email"
            type="email"
            required
            defaultValue={defaults.email}
            autoComplete="email"
          />
        </Field>
      </div>
      <Field label="City / address" htmlFor={`inq-address-${projectId}`}>
        <Input
          id={`inq-address-${projectId}`}
          name="address"
          required
          defaultValue={defaults.address}
          autoComplete="street-address"
        />
      </Field>
      <Field label="Message" htmlFor={`inq-message-${projectId}`}>
        <Textarea
          id={`inq-message-${projectId}`}
          name="message"
          required
          rows={3}
          placeholder="e.g. Please share the payment plan for a 2-bed unit"
        />
      </Field>
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Send inquiry"}
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
