import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AccountFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-4 border-t border-zinc-100 pt-5 first:border-t-0 first:pt-0",
        className
      )}
    >
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function AccountFormField({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function AccountFormCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AccountPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>
    </div>
  );
}

export function AccountSignInGate({
  title,
  description,
  returnPath,
}: {
  title: string;
  description: string;
  returnPath: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <p className="font-medium text-zinc-900">{title}</p>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
      <a
        href={`/login?ref=${encodeURIComponent(returnPath)}`}
        className="mt-5 inline-flex h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Sign in
      </a>
    </div>
  );
}
