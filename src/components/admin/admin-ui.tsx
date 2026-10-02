import Link from "next/link";
import type { ReactNode } from "react";
import { designTw } from "@/config/design-tokens";
import { inputFieldClass, inputInlineClass } from "@/lib/form-styles";
import { Button } from "@/components/ui/button";

/**
 * @deprecated Prefer `<Input layout="field" />` from `@/components/ui/input`.
 */
export const adminInputClass = inputFieldClass;

/** @deprecated Prefer `<Input layout="inline" />` or `inputInlineClass`. */
export const adminSearchInput = inputInlineClass;

/**
 * @deprecated Prefer `<Button>` from `@/components/ui/button`.
 */
export const adminBtnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-zinc-700 to-zinc-900 px-4 py-2 text-sm font-semibold text-brand-foreground shadow-clay-btn hover:from-zinc-600 disabled:opacity-50";

/** @deprecated Prefer `<Button variant="outline">`. */
export const adminBtnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/80 bg-clay-surface px-4 py-2 text-sm font-semibold text-zinc-700 shadow-clay-sm hover:shadow-clay disabled:opacity-50";

export const adminCard =
  "overflow-hidden rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay";

export const adminPanel = "rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay";

/** Same `<th>` styling as public project units tables (`designTw.tableHead`). */
export const adminTableHead = designTw.tableHead;

export function AdminBackLink({
  href,
  children = "Back",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href as "/admin/dashboard"} className="text-sm text-zinc-500 hover:text-zinc-800">
      ← {children}
    </Link>
  );
}

export function AdminPageToolbar({
  total,
  hint,
  children,
}: {
  total?: number;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-zinc-500">
        {total != null && (
          <span>
            {total} {total === 1 ? "record" : "records"}
          </span>
        )}
        {hint && <span className="text-zinc-400"> · {hint}</span>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function AdminDbAlert({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">Database required</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2 text-xs">
        Set <code className="rounded bg-amber-100 px-1">USE_DATABASE=true</code> in{" "}
        <code className="rounded bg-amber-100 px-1">.env</code> and start MySQL.
      </p>
    </div>
  );
}

export function AdminErrorAlert({
  message,
  backHref,
  backLabel = "Projects",
}: {
  message: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      {message}
      {backHref && (
        <div className="mt-2">
          <AdminBackLink href={backHref}>{backLabel}</AdminBackLink>
        </div>
      )}
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>
        Previous
      </Button>
      <span className="text-sm text-zinc-500">
        Page {page} of {totalPages}
      </span>
      <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={onNext}>
        Next
      </Button>
    </div>
  );
}

export function AdminLinkAction({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href as "/admin/dashboard"}
      className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
    >
      {children}
    </Link>
  );
}
