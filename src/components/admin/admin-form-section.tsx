import { adminPanel } from "@/components/admin/admin-ui";
import { inputFieldClass } from "@/lib/form-styles";
import type { KeyboardEvent } from "react";

/** Stop Enter in text fields from submitting long create/edit forms. */
export function preventImplicitFormSubmit(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter") return;
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.tagName === "TEXTAREA") return;
  if (target instanceof HTMLButtonElement && target.type === "submit") return;
  if (target instanceof HTMLInputElement && target.type === "submit") return;
  e.preventDefault();
}

export function AdminFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={adminPanel}>
      <div className="border-b border-zinc-100 px-5 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-800">{title}</h3>
        {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <span className="block text-sm font-medium text-zinc-700">
      {children}
      {required && <span className="text-zinc-500"> *</span>}
      {hint && <span className="mt-0.5 block text-xs font-normal text-zinc-400">{hint}</span>}
    </span>
  );
}

export const inputClass = inputFieldClass;
export const selectClass = inputFieldClass;
