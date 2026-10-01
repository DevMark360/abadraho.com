"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { useAuth } from "@/components/auth/auth-provider";
import { initialFormActionState } from "@/lib/form-action-state";
import { submitContactForm } from "@/app/actions/public-forms";
import { designTw } from "@/config/design-tokens";
import { CONTACT_LIMITS } from "@/lib/contact-form";
import { HONEYPOT_FIELD } from "@/lib/form-spam";
import { contactFormDefaults } from "@/lib/form-user-defaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const { user, loading: authLoading } = useAuth();
  const defaults = useMemo(() => contactFormDefaults(user), [user]);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    submitContactForm,
    initialFormActionState
  );

  useEffect(() => {
    if (state.status === "ok") {
      setFormKey((k) => k + 1);
    }
  }, [state.status]);

  return (
    <form
      key={`contact-${user?.id ?? "guest"}-${formKey}`}
      action={formAction}
      className={designTw.publicCard + " relative space-y-4 p-6 lg:col-span-3"}
    >
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
        <h2 className="text-lg font-semibold text-zinc-900">Send a message</h2>
        {user && !authLoading ? (
          <p className="mt-1 text-xs text-zinc-500">
            Contact details pre-filled from your account
          </p>
        ) : null}
      </div>
      <Input
        name="name"
        required
        maxLength={CONTACT_LIMITS.name}
        placeholder="Name"
        defaultValue={defaults.name}
        autoComplete="name"
      />
      <Input
        name="email"
        type="email"
        required
        maxLength={CONTACT_LIMITS.email}
        placeholder="Email"
        defaultValue={defaults.email}
        autoComplete="email"
      />
      <Input
        name="phone"
        type="tel"
        required
        maxLength={CONTACT_LIMITS.phone}
        inputMode="tel"
        placeholder="Phone (10–12 digits)"
        defaultValue={defaults.phone}
        autoComplete="tel"
      />
      <Input
        name="subject"
        required
        maxLength={CONTACT_LIMITS.subject}
        placeholder="Subject"
      />
      <Textarea
        name="message"
        required
        rows={5}
        maxLength={CONTACT_LIMITS.message}
        placeholder="Message"
      />
      {state.status === "ok" && state.message ? (
        <AuthFormMessage variant="success">{state.message}</AuthFormMessage>
      ) : null}
      {state.status === "error" && state.message ? (
        <AuthFormMessage variant="error">{state.message}</AuthFormMessage>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
