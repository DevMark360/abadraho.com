"use client";

import Link from "next/link";
import { AdminBackLink, adminCard } from "@/components/admin/admin-ui";

const imports = [
  {
    href: "/admin/projects/import",
    label: "Import projects",
    hint: "Upload a project CSV.",
  },
  {
    href: "/admin/import/areas",
    label: "Import areas",
    hint: "CSV column: name",
  },
  {
    href: "/admin/import/units",
    label: "Import units",
    hint: "CSV: project_id, title, price, …",
  },
  {
    href: "/admin/import/types",
    label: "Import project types",
    hint: "CSV column: title",
  },
] as const;

export function AdminImportHubClient() {
  return (
    <div className="max-w-2xl space-y-4">
      <AdminBackLink href="/admin/dashboard">Dashboard</AdminBackLink>
      <p className="text-sm text-zinc-600">
        Bulk CSV uploads for projects, units, areas, and types. Files are saved under{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">public/uploads/project_imports</code>.
      </p>
      <ul className="space-y-3">
        {imports.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`${adminCard} block p-4 transition hover:border-zinc-300`}
            >
              <p className="font-medium text-zinc-900">{item.label}</p>
              <p className="mt-1 text-sm text-zinc-500">{item.hint}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
