"use client";

import { useState } from "react";
import { FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type ImportSummary = {
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: { row: number; message: string }[];
};

type Phase = "idle" | "checking" | "importing";

async function sendCsv(file: File, dryRun: boolean): Promise<ImportSummary> {
  const body = new FormData();
  body.append("file", file);
  if (dryRun) body.append("dryRun", "1");
  const res = await fetch("/api/admin/units/csv", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string } & ImportSummary;
  if (!json.success) throw new Error(json.message ?? "Import failed");
  return json;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl bg-clay-well px-3 py-2 shadow-clay-inset">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={cn(
          "text-lg font-bold text-zinc-900",
          tone === "good" && value > 0 && "text-emerald-700",
          tone === "bad" && value > 0 && "text-red-600"
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

/** Check a units CSV (dry run), review what will change, then apply it. */
export function AdminUnitsCsvImport({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState("");

  const busy = phase !== "idle";
  const changes = summary ? summary.created + summary.updated : 0;
  const done = summary != null && !summary.dryRun;

  async function run(dryRun: boolean) {
    if (!file) return;
    setPhase(dryRun ? "checking" : "importing");
    setError("");
    try {
      const result = await sendCsv(file, dryRun);
      setSummary(result);
      if (!dryRun) onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setPhase("idle");
    }
  }

  function chooseFile(next: File | null) {
    setFile(next);
    setSummary(null);
    setError("");
  }

  return (
    <div className={cn(adminCard, "space-y-4 p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Import units from CSV</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Export first, edit the file, then import it back. Rows with a Unit ID update that unit;
            rows without one update the unit with the same project and title, or add a new unit.
            Blank cells keep the current value, and an area of 0 clears it.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close import">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          layout="field"
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          className="max-w-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm"
        />
        <Button type="button" variant="outline" disabled={!file || busy} onClick={() => run(true)}>
          {phase === "checking" ? "Checking…" : "Check file"}
        </Button>
        {summary?.dryRun && changes > 0 ? (
          <Button type="button" disabled={busy} onClick={() => run(false)}>
            {phase === "importing" ? "Importing…" : `Import ${changes.toLocaleString()} changes`}
          </Button>
        ) : null}
      </div>

      {busy ? (
        <p className="text-sm text-zinc-500">
          {phase === "checking" ? "Reading the file…" : "Saving changes…"} Large files can take a
          few seconds.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      ) : null}

      {summary ? (
        <div className="space-y-3">
          <p
            className={cn(
              "flex items-center gap-2 text-sm font-medium",
              done ? "text-emerald-700" : "text-zinc-700"
            )}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
            {done
              ? `Import finished: ${summary.created.toLocaleString()} added, ${summary.updated.toLocaleString()} updated.`
              : changes > 0
                ? "Preview only. Nothing is saved until you click Import."
                : "Nothing to import: every row is unchanged or has an error."}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label="Rows" value={summary.totalRows} />
            <Stat label={done ? "Added" : "New"} value={summary.created} tone="good" />
            <Stat label="Updated" value={summary.updated} tone="good" />
            <Stat label="Unchanged" value={summary.unchanged} />
            <Stat label="Errors" value={summary.failed} tone="bad" />
          </div>

          {summary.errors.length ? (
            <div>
              <p className="mb-2 text-sm text-zinc-600">
                Rows with errors are skipped{done ? "" : " on import"}.
                {summary.failed > summary.errors.length
                  ? ` Showing the first ${summary.errors.length} of ${summary.failed.toLocaleString()}.`
                  : ""}
              </p>
              <div className="max-h-64 overflow-auto rounded-xl border border-zinc-200">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0">
                    <tr>
                      <th className={adminTableHead}>Row</th>
                      <th className={adminTableHead}>Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.errors.map((e) => (
                      <tr key={`${e.row}-${e.message}`} className="border-t border-zinc-100">
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-zinc-500">
                          {e.row}
                        </td>
                        <td className="px-3 py-2 text-zinc-800">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
