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
import { EmailInput } from "@/components/ui/email-input";
import { PhoneInput } from "@/components/ui/phone-input";

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
      className={designTw.publicCard + " relative space-y-4 p-6 sm:p-7 lg:col-span-3"}
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
        <h2 className="text-lg font-bold tracking-tight text-zinc-900">Send a message</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {user && !authLoading
            ? "Contact details pre-filled from your account."
            : "We usually reply by email or phone during office hours."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="contact-name">
          <Input
            id="contact-name"
            name="name"
            required
            maxLength={CONTACT_LIMITS.name}
            defaultValue={defaults.name}
            autoComplete="name"
          />
        </Field>
        <Field label="Email" htmlFor="contact-email">
          <EmailInput
            id="contact-email"
            name="email"
            layout="field"
            maxLength={CONTACT_LIMITS.email}
            defaultValue={defaults.email}
          />
        </Field>
        <Field label="Phone" htmlFor="contact-phone">
          <PhoneInput id="contact-phone" name="phone" defaultValue={defaults.phone} className="mt-1" />
        </Field>
        <Field label="Subject" htmlFor="contact-subject">
          <Input
            id="contact-subject"
            name="subject"
            required
            maxLength={CONTACT_LIMITS.subject}
            placeholder="e.g. Site visit request"
          />
        </Field>
      </div>
      <Field label="Message" htmlFor="contact-message">
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={CONTACT_LIMITS.message}
          placeholder="How can we help?"
        />
      </Field>
      {state.status === "ok" && state.message ? (
        <AuthFormMessage variant="success">{state.message}</AuthFormMessage>
      ) : null}
      {state.status === "error" && state.message ? (
        <AuthFormMessage variant="error">{state.message}</AuthFormMessage>
      ) : null}
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
