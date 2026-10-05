"use client";
import "@/styles/font-awesome-local.css";
import { LoadingState } from "@/components/ui/loading-state";

import { useEffect, useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2, GitCompare, Link2, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { CompareInquiryPanel } from "@/components/compare/compare-inquiry-panel";
import { CompareProjectPicker } from "@/components/compare/compare-project-picker";
import { AuthGatePrompt } from "@/components/project-detail/auth-gate-prompt";
import { Select } from "@/components/ui/select";
import {
  requestClearCompare,
  requestRemoveFromCompare,
  requestSetCompareUnit,
} from "@/lib/client/compare-actions";
import {
  buildCompareShareUrl,
  hydrateCompareFromUrlIds,
} from "@/lib/client/compare-sync";
import {
  getCompareList,
  getCompareSnapshotKey,
  MAX_COMPARE,
} from "@/lib/client/compare-store";
import { CompareHelpPanel } from "@/components/marketing/compare-help-panel";
import { designTw } from "@/config/design-tokens";
import { RoomTypeIcon } from "@/lib/room-type-icon";
import { formatPrice } from "@/lib/utils";
import type { CompareProjectPayload } from "@/types/compare";
import type { ProjectUnit } from "@/types/project-detail";

type ProjectRow = {
  label: string;
  getValue: (p: CompareProjectPayload) => string;
};

type UnitRow = {
  label: string;
  getValue: (u: ProjectUnit) => string;
};

const PROJECT_ROWS: ProjectRow[] = [
  { label: "Location", getValue: (p) => p.area ?? "—" },
  { label: "Address", getValue: (p) => p.address ?? "—" },
  {
    label: "Price from",
    getValue: (p) => (p.minPrice ? formatPrice(p.minPrice) : "On request"),
  },
  { label: "Handover", getValue: (p) => p.handoverQuarter ?? p.handoverLabel ?? "—" },
  { label: "Progress", getValue: (p) => p.progressName ?? "—" },
  { label: "Developer", getValue: (p) => p.builderName ?? "—" },
  {
    label: "Installment length",
    getValue: (p) =>
      p.installmentMonths ? `${p.installmentMonths} months` : "—",
  },
];

const UNIT_ROWS: UnitRow[] = [
  { label: "Unit", getValue: (u) => u.title ?? "—" },
  { label: "Type", getValue: (u) => u.unitType ?? "—" },
  {
    label: "Gross area",
    getValue: (u) => (u.grossArea ? `${u.grossArea} sq.ft` : "—"),
  },
  {
    label: "Net area",
    getValue: (u) => (u.netArea ? `${u.netArea} sq.ft` : "—"),
  },
  {
    label: "Price",
    getValue: (u) => (u.price ? formatPrice(u.price) : "—"),
  },
  {
    label: "Down payment",
    getValue: (u) => (u.downPayment ? formatPrice(u.downPayment) : "—"),
  },
  {
    label: "Monthly installment",
    getValue: (u) =>
      u.monthlyInstallment ? formatPrice(u.monthlyInstallment) : "—",
  },
  {
    label: "Total amount",
    getValue: (u) =>
      u.totalUnitAmount ? formatPrice(u.totalUnitAmount) : "—",
  },
  {
    label: "Loan amount",
    getValue: (u) => (u.loanAmount ? formatPrice(u.loanAmount) : "—"),
  },
  {
    label: "Room types",
    getValue: (u) =>
      u.roomBreakdown.length
        ? u.roomBreakdown.map((r) => r.roomTypeName).join(", ")
        : "—",
  },
];

function subscribeCompare(cb: () => void) {
  window.addEventListener("abadraho-compare", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("abadraho-compare", cb);
    window.removeEventListener("storage", cb);
  };
}

function resolveUnit(
  project: CompareProjectPayload | null | undefined,
  unitId: number | null | undefined
): ProjectUnit | null {
  if (!project?.units.length) return null;
  if (unitId) {
    return project.units.find((u) => u.id === unitId) ?? project.units[0];
  }
  return project.units[0];
}

function CompareSectionHeader({ label }: { label: string }) {
  return (
    <div className="border-b border-zinc-200 bg-zinc-900 px-4 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white">
        {label}
      </p>
    </div>
  );
}

function projectHasUnits(project: CompareProjectPayload): boolean {
  return project.hasUnits === true || project.units.length > 0;
}

async function enrichProjectUnits(
  projects: CompareProjectPayload[]
): Promise<CompareProjectPayload[]> {
  return Promise.all(
    projects.map(async (project) => {
      const units = await Promise.all(
        project.units.map(async (unit) => {
          if (unit.roomBreakdown.length > 0) return unit;
          const res = await fetch("/api/v1/unit-types", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: unit.id }),
          });
          if (!res.ok) return unit;
          const full = (await res.json()) as ProjectUnit | null;
          if (!full?.roomBreakdown?.length) return unit;
          return {
            ...unit,
            roomBreakdown: full.roomBreakdown,
          };
        })
      );
      return { ...project, units };
    })
  );
}

function CompareUnitRoomsTable({ unit }: { unit: ProjectUnit | null }) {
  if (!unit) {
    return <p className="text-sm text-zinc-400">—</p>;
  }

  if (!unit.roomBreakdown.length) {
    return (
      <p className="py-4 text-center text-sm text-zinc-500">No unit room details.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={designTw.tableHead}>Name</th>
            <th className={designTw.tableHead}>Width × Length</th>
            <th className={designTw.tableHead}>Covered area</th>
          </tr>
        </thead>
        <tbody>
          {unit.roomBreakdown.map((r, i) => (
            <tr key={i} className="border-b border-zinc-100">
              <td className="px-3 py-2.5 font-medium text-zinc-900">
                <RoomTypeIcon icon={r.icon} className="mr-1.5 text-zinc-600" />
                {r.roomTypeName}
                {r.count ? ` (${r.count})` : ""}
              </td>
              <td className="px-3 py-2.5 text-zinc-700">{r.dimensions ?? "—"}</td>
              <td className="px-3 py-2.5 text-zinc-700">
                {r.coveredArea != null ? `${r.coveredArea} sq.ft` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompareUnitSelector({
  project,
  unit,
  isLoggedIn,
}: {
  project: CompareProjectPayload | null;
  unit: ProjectUnit | null;
  isLoggedIn: boolean;
}) {
  if (!project) {
    return <p className="text-sm text-zinc-400">—</p>;
  }

  if (!projectHasUnits(project)) {
    return (
      <p className="text-sm text-zinc-500">No units listed for this project.</p>
    );
  }

  if (!isLoggedIn) {
    return (
      <p className="text-sm text-zinc-500">Register or sign in to select a unit.</p>
    );
  }

  if (project.units.length === 0) {
    return <LoadingState size="sm" label="Loading unit details…" />;
  }

  return (
    <label className="block text-sm">
      <Select
        layout="field"
        value={String(unit?.id ?? project.units[0].id)}
        onChange={(e) => requestSetCompareUnit(project.id, Number(e.target.value))}
      >
        {project.units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.title ?? `Unit ${u.id}`}
            {u.price ? ` · ${formatPrice(u.price)}` : ""}
          </option>
        ))}
      </Select>
    </label>
  );
}

function CompareGatedSection({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-t border-zinc-200">
      <CompareSectionHeader label={label} />
      <AuthGatePrompt
        variant="inline"
        title={title}
        description={description}
        returnPath="/compare"
      />
    </div>
  );
}

function CompareSpecGrid({
  rows,
  values,
  sectionLabel,
}: {
  rows: { label: string }[];
  values: [string | null, string | null][];
  sectionLabel?: string;
}) {
  return (
    <div>
      {sectionLabel && (
        <div className="border-b border-zinc-200 bg-zinc-900 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-white">
            {sectionLabel}
          </p>
        </div>
      )}
      <div className="divide-y divide-zinc-100">
        {rows.map((row, i) => {
          const [v0, v1] = values[i];
          const differs =
            v0 !== null && v1 !== null && v0 !== "—" && v1 !== "—" && v0 !== v1;
          return (
            <div
              key={row.label}
              className="grid grid-cols-1 sm:grid-cols-[160px_1fr_1fr]"
            >
              <div className="hidden bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:flex sm:items-center">
                {row.label}
              </div>
              {[0, 1].map((col) => (
                <div
                  key={col}
                  className={`px-4 py-3 sm:py-3.5 ${
                    col === 0 ? "sm:border-r sm:border-zinc-100" : ""
                  } ${differs ? "bg-amber-50/70" : ""}`}
                >
                  <p className="text-xs font-medium text-zinc-400 sm:hidden">
                    {row.label}
                  </p>
                  <p className="text-sm font-medium text-zinc-900">
                    {values[i][col] ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompareView({
  initialLoggedIn = false,
  initialUrlIds = [],
}: {
  initialLoggedIn?: boolean;
  initialUrlIds?: number[];
}) {
  const { user, loading: authLoading } = useAuth();
  const isLoggedIn = authLoading ? initialLoggedIn : Boolean(user);
  const compareKey = useSyncExternalStore(
    subscribeCompare,
    getCompareSnapshotKey,
    () => ""
  );
  const slots = compareKey ? getCompareList() : [];
  const [projects, setProjects] = useState<(CompareProjectPayload | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [urlHydrated, setUrlHydrated] = useState(false);

  useEffect(() => {
    if (!initialUrlIds.length || urlHydrated) return;
    let cancelled = false;
    void hydrateCompareFromUrlIds(initialUrlIds).then(() => {
      if (!cancelled) setUrlHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initialUrlIds, urlHydrated]);

  useEffect(() => {
    if (!compareKey) {
      setProjects([]);
      setLoading(false);
      return;
    }
    const list = getCompareList();
    let cancelled = false;
    setLoading(true);
    const loggedIn = isLoggedIn;

    fetch("/api/v1/projects/compare", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: list.map((e) => e.id) }),
    })
      .then((r) => r.json())
      .then(async (json) => {
        if (cancelled) return;
        let data = (json.data ?? []) as CompareProjectPayload[];
        if (loggedIn && data.length) {
          data = await enrichProjectUnits(data);
        }
        setProjects(
          list.map((entry) => data.find((p) => p.id === entry.id) ?? null)
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [compareKey, isLoggedIn]);

  const selectedUnits = useMemo((): [ProjectUnit | null, ProjectUnit | null] => {
    const list = compareKey ? getCompareList() : [];
    return [
      resolveUnit(projects[0], list[0]?.unitId),
      resolveUnit(projects[1], list[1]?.unitId),
    ];
  }, [projects, compareKey]);

  const filled = projects.filter((p): p is CompareProjectPayload => p != null);
  const ready = filled.length === MAX_COMPARE;
  const anyProjectHasUnits = filled.some(projectHasUnits);
  const unitsLoaded = filled.some((p) => p.units.length > 0);
  const hasSelectedUnits = Boolean(selectedUnits[0] || selectedUnits[1]);
  const hasPlanImages = selectedUnits.some(
    (u) => u?.floorPlanUrl || u?.paymentPlanUrl
  );
  const hasRoomDetails = selectedUnits.some(
    (u) => u != null && u.roomBreakdown.length > 0
  );
  const showUnitPricingGate = !isLoggedIn;
  const showUnitDetailsGate = !isLoggedIn;
  const showPlansGate = !isLoggedIn;

  const projectValues = PROJECT_ROWS.map((row) => [
    projects[0] ? row.getValue(projects[0]) : null,
    projects[1] ? row.getValue(projects[1]) : null,
  ] as [string | null, string | null]);

  const unitValues = UNIT_ROWS.map((row) => [
    selectedUnits[0] ? row.getValue(selectedUnits[0]) : null,
    selectedUnits[1] ? row.getValue(selectedUnits[1]) : null,
  ] as [string | null, string | null]);

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <Link
            href="/projects"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
                <GitCompare className="h-7 w-7" />
                Compare projects
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Compare up to {MAX_COMPARE} projects side by side. Pick a unit on each side.
                {isLoggedIn ? " Your list is saved to your account." : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {slots.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const url = buildCompareShareUrl();
                      try {
                        await navigator.clipboard.writeText(url);
                        setShareMsg("Link copied. Share with clients or colleagues.");
                      } catch {
                        setShareMsg(url);
                      }
                      window.setTimeout(() => setShareMsg(null), 4000);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
                  >
                    <Link2 className="h-4 w-4" />
                    Copy share link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void requestClearCompare();
                      setProjects([]);
                    }}
                    className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900"
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
          </div>

          {shareMsg ? (
            <p className="mt-2 text-sm text-emerald-700" role="status">
              {shareMsg}
            </p>
          ) : null}

          {slots.length > 0 ? (
            <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Maximum {MAX_COMPARE} projects. Adding a third opens a swap dialog so you can
              replace one.
            </p>
          ) : null}

          <CompareHelpPanel className="mt-4" />

          {!loading && slots.length === 0 && (
            <div className="mt-8">
              <p className="mb-6 text-center text-sm text-zinc-600">
                Pick two projects to compare payment plans, handover dates, and unit pricing side
                by side.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <CompareProjectPicker slotLabel="Project 1" />
                <CompareProjectPicker slotLabel="Project 2" />
              </div>
            </div>
          )}

          {slots.length > 0 && (
            <div className="mt-8 overflow-hidden rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay">
              <div className="grid grid-cols-1 border-b border-zinc-200 sm:grid-cols-2">
                {[0, 1].map((col) => {
                  const entry = slots[col];
                  const project = projects[col];
                  return (
                    <div
                      key={col}
                      className={`relative p-5 ${col === 0 ? "sm:border-r sm:border-zinc-200" : ""}`}
                    >
                      {entry && project ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void requestRemoveFromCompare(project.id)}
                            className="absolute right-3 top-3 rounded-full bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200"
                            aria-label="Remove from compare"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <Link href={`/project/${project.slug}`} className="block">
                            <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-xl bg-zinc-100">
                              {project.imageUrl ? (
                                <Image
                                  src={project.imageUrl}
                                  alt={project.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-zinc-300">
                                  <Building2 className="h-14 w-14" />
                                </div>
                              )}
                            </div>
                            <h2 className="pr-8 text-lg font-semibold text-zinc-900 hover:underline">
                              {project.name}
                            </h2>
                            <p className="mt-1 text-sm text-zinc-500">{project.area}</p>
                          </Link>
                        </>
                      ) : entry && !project ? (
                        <div className="flex min-h-[280px] items-center justify-center">
                          <LoadingState size="sm" label="Loading project…" />
                        </div>
                      ) : (
                        <CompareProjectPicker slotLabel={`Project ${col + 1}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {filled.length > 0 && (
                <>
                  <CompareSpecGrid
                    rows={PROJECT_ROWS}
                    values={projectValues}
                    sectionLabel="Project overview"
                  />

                  <div className="border-t border-zinc-200">
                    <CompareSectionHeader label="Unit to compare" />
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      {[0, 1].map((col) => (
                        <div
                          key={col}
                          className={`p-4 ${col === 0 ? "sm:border-r sm:border-zinc-100" : ""}`}
                        >
                          <CompareUnitSelector
                            project={projects[col]}
                            unit={selectedUnits[col]}
                            isLoggedIn={isLoggedIn}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {showUnitPricingGate ? (
                    <CompareGatedSection
                      label="Unit & pricing"
                      title="Register or sign in to view this"
                      description="Compare unit prices, areas, installments, and room details side by side."
                    />
                  ) : anyProjectHasUnits ? (
                    hasSelectedUnits ? (
                      <CompareSpecGrid
                        rows={UNIT_ROWS}
                        values={unitValues}
                        sectionLabel="Unit & pricing"
                      />
                    ) : (
                      <div className="border-t border-zinc-200">
                        <CompareSectionHeader label="Unit & pricing" />
                        <p className="px-4 py-6 text-center text-sm text-zinc-500">
                          {unitsLoaded ? "Select a unit to compare pricing." : "Loading unit details…"}
                        </p>
                      </div>
                    )
                  ) : null}

                  {showUnitDetailsGate ? (
                    <CompareGatedSection
                      label="Unit Details"
                      title="Register or sign in to view this"
                      description="Compare room-by-room dimensions, layout, and covered areas for each unit."
                    />
                  ) : anyProjectHasUnits ? (
                    hasSelectedUnits && hasRoomDetails ? (
                      <div className="border-t border-zinc-200">
                        <CompareSectionHeader label="Unit Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2">
                          {[0, 1].map((col) => (
                            <div
                              key={col}
                              className={`p-4 ${col === 0 ? "sm:border-r sm:border-zinc-100" : ""}`}
                            >
                              <CompareUnitRoomsTable unit={selectedUnits[col]} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : hasSelectedUnits ? (
                      <div className="border-t border-zinc-200">
                        <CompareSectionHeader label="Unit Details" />
                        <p className="px-4 py-6 text-center text-sm text-zinc-400">
                          No room details for the selected units.
                        </p>
                      </div>
                    ) : (
                      <div className="border-t border-zinc-200">
                        <CompareSectionHeader label="Unit Details" />
                        <p className="px-4 py-6 text-center text-sm text-zinc-500">
                          {unitsLoaded
                            ? "Select a unit to compare room details."
                            : "Loading unit details…"}
                        </p>
                      </div>
                    )
                  ) : null}

                  {showPlansGate ? (
                    <CompareGatedSection
                      label="Plans"
                      title="Register or sign in to view this"
                      description="See floor plans and payment schedules for each unit you compare."
                    />
                  ) : anyProjectHasUnits ? (
                    hasPlanImages ? (
                      <div>
                        <CompareSectionHeader label="Plans" />
                        <div className="grid grid-cols-1 sm:grid-cols-2">
                          {[0, 1].map((col) => {
                            const unit = selectedUnits[col];
                            return (
                              <div
                                key={col}
                                className={`space-y-4 p-4 ${
                                  col === 0 ? "sm:border-r sm:border-zinc-100" : ""
                                }`}
                              >
                                {unit?.floorPlanUrl && (
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                                      Floor plan
                                    </p>
                                    <a
                                      href={unit.floorPlanUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block overflow-hidden rounded-lg border border-zinc-200"
                                    >
                                      <img
                                        src={unit.floorPlanUrl}
                                        alt="Floor plan"
                                        className="max-h-48 w-full object-contain bg-zinc-50"
                                      />
                                    </a>
                                  </div>
                                )}
                                {unit?.paymentPlanUrl && (
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                                      Payment plan
                                    </p>
                                    <a
                                      href={unit.paymentPlanUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block overflow-hidden rounded-lg border border-zinc-200"
                                    >
                                      <img
                                        src={unit.paymentPlanUrl}
                                        alt="Payment plan"
                                        className="max-h-48 w-full object-contain bg-zinc-50"
                                      />
                                    </a>
                                  </div>
                                )}
                                {!unit?.floorPlanUrl && !unit?.paymentPlanUrl && (
                                  <p className="text-sm text-zinc-400">No plans uploaded</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : hasSelectedUnits ? (
                      <div className="border-t border-zinc-200">
                        <CompareSectionHeader label="Plans" />
                        <p className="px-4 py-6 text-center text-sm text-zinc-400">
                          No plans uploaded for the selected units.
                        </p>
                      </div>
                    ) : (
                      <div className="border-t border-zinc-200">
                        <CompareSectionHeader label="Plans" />
                        <p className="px-4 py-6 text-center text-sm text-zinc-500">
                          {unitsLoaded ? "Select a unit to view plans." : "Loading unit details…"}
                        </p>
                      </div>
                    )
                  ) : null}

                  <div className="border-t border-zinc-200 bg-zinc-50/40">
                    <CompareSectionHeader label="Submit inquiry" />
                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                      {[0, 1].map((col) => {
                        const project = projects[col];
                        return (
                          <div
                            key={col}
                            className={col === 0 ? "sm:border-r sm:border-zinc-100 sm:pr-4" : "sm:pl-0"}
                          >
                            {project ? (
                              <CompareInquiryPanel
                                projectId={project.id}
                                projectName={project.name}
                                unit={selectedUnits[col]}
                                fallbackUnits={project.units}
                              />
                            ) : (
                              <div className="rounded-clay-lg bg-clay-well shadow-clay-inset p-6 text-center text-sm text-zinc-400">
                                Add a project to inquire
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {!loading && slots.length === 1 && (
            <p className="mt-4 text-center text-sm text-amber-800">
              Add one more project for a full side-by-side comparison.
            </p>
          )}

          {!loading &&
            ready &&
            isLoggedIn &&
            selectedUnits[0] &&
            selectedUnits[1] && (
              <p className="mt-4 text-center text-sm text-emerald-700">
                Comparing {selectedUnits[0].title} vs {selectedUnits[1].title}
              </p>
            )}
        </div>
      </div>
    </AppShell>
  );
}
