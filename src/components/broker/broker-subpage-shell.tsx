"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { designTw } from "@/config/design-tokens";

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

type BrokerSubpageShellProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  iconBgClassName?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Pass to `BrokerSubpageShell` `icon` — avoids dynamic component render issues. */
export function brokerPageIcon(Icon: LucideIcon, iconClassName = "text-zinc-700") {
  return <Icon className={cn("h-6 w-6", iconClassName)} aria-hidden />;
}

export function BrokerSubpageShell({
  title,
  description,
  icon,
  iconBgClassName = "bg-zinc-100",
  action,
  children,
  className,
}: BrokerSubpageShellProps) {
  return (
    <div className={cn("mx-auto max-w-6xl space-y-6", className)}>
      <Link
        href="/broker"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
      >
        <BackArrowIcon className="h-4 w-4" />
        Agent portal
      </Link>

      <header className={cn(designTw.publicCard, "overflow-hidden")}>
        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {icon ? (
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                  iconBgClassName
                )}
              >
                {icon}
              </div>
            ) : null}
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-600">{description}</p>
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </header>

      {children}
    </div>
  );
}

export function BrokerEmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className={cn(designTw.publicCard, "flex flex-col items-center px-6 py-14 text-center")}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
        <Icon className="h-7 w-7 text-zinc-400" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref as Route}
          className="mt-6 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function BrokerCountBadge({ count, label }: { count: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
      <span className="font-semibold text-zinc-900">{count.toLocaleString()}</span>
      {label}
    </span>
  );
}
