"use client";
import { LoadingState } from "@/components/ui/loading-state";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GitCompare } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import type { ProjectUnit } from "@/types/project-detail";
import { RoomTypeIcon } from "@/lib/room-type-icon";
import { PlanImageViewer } from "@/components/project-detail/plan-image-viewer";
import { Button } from "@/components/ui/button";
import { requestAddCompareWithUnit } from "@/lib/client/compare-actions";
import { apiFetch } from "@/lib/client/api-fetch";

/** Load full unit details only after this many types (or when section scrolls into view). */
const LAZY_UNIT_THRESHOLD = 4;

type SubTab = "payment" | "floor" | "rooms";

function defaultSubTab(unit: ProjectUnit): SubTab {
  if (unit.paymentPlanUrl) return "payment";
  if (unit.floorPlanUrl) return "floor";
  if (unit.roomBreakdown.length > 0) return "rooms";
  return "payment";
}

function UnitSpecs({ unit, installmentMonths }: { unit: ProjectUnit; installmentMonths?: number | null }) {
  const rows: { label: string; value: string }[] = [
    { label: "Project type", value: unit.unitType ?? "—" },
    { label: "Gross area", value: unit.grossArea ? `${unit.grossArea} sq.ft` : "—" },
    { label: "Net area", value: unit.netArea ? `${unit.netArea} sq.ft` : "—" },
    {
      label: "Installment length",
      value: installmentMonths ? `${installmentMonths} months` : "—",
    },
    { label: "Down payment", value: unit.downPayment ? formatPrice(unit.downPayment) : "—" },
  ];
  if (unit.loanAmount) {
    rows.push({ label: "Loan amount", value: formatPrice(unit.loanAmount) });
  }
  rows.push(
    { label: "Installment amount", value: unit.monthlyInstallment ? formatPrice(unit.monthlyInstallment) : "—" },
    { label: "Price", value: unit.price ? formatPrice(unit.price) : "—" }
  );
  if (unit.totalUnitAmount) {
    rows.push({ label: "Total amount", value: formatPrice(unit.totalUnitAmount) });
  }

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <ul className="space-y-2 text-sm">
        {rows.slice(0, Math.ceil(rows.length / 2)).map((r) => (
          <li key={r.label} className="flex justify-between gap-4 border-b border-zinc-50 pb-1">
            <span className="text-zinc-500">{r.label}</span>
            <span className="font-medium text-zinc-900">{r.value}</span>
          </li>
        ))}
      </ul>
      <ul className="space-y-2 text-sm">
        {rows.slice(Math.ceil(rows.length / 2)).map((r) => (
          <li key={r.label} className="flex justify-between gap-4 border-b border-zinc-50 pb-1">
            <span className="text-zinc-500">{r.label}</span>
            <span className="font-medium text-zinc-900">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnitRoomsTable({ unit }: { unit: ProjectUnit }) {
  if (!unit.roomBreakdown.length) {
    return <p className="py-8 text-center text-sm text-zinc-500">No unit room details.</p>;
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
              <td className="px-4 py-3 font-medium text-zinc-900">
                <RoomTypeIcon icon={r.icon} className="mr-2 text-zinc-600" />
                {r.roomTypeName}
                {r.count ? ` (${r.count})` : ""}
              </td>
              <td className="px-4 py-3 text-zinc-700">{r.dimensions ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-700">
                {r.coveredArea != null ? `${r.coveredArea} sq.ft` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnitPanel({
  unit,
  installmentMonths,
}: {
  unit: ProjectUnit;
  installmentMonths?: number | null;
}) {
  const hasPayment = Boolean(unit.paymentPlanUrl);
  const hasFloor = Boolean(unit.floorPlanUrl);
  const hasRooms = unit.roomBreakdown.length > 0;
  const [subTab, setSubTab] = useState<SubTab>(() => defaultSubTab(unit));

  useEffect(() => {
    setSubTab(defaultSubTab(unit));
  }, [unit.id]);

  if (!hasPayment && !hasFloor && !hasRooms) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500">
        No plans or room details for this unit.
      </div>
    );
  }

  return (
    <div>
      <UnitSpecs unit={unit} installmentMonths={installmentMonths} />

      <nav className="flex flex-wrap border-b border-zinc-200" role="tablist">
        {hasPayment && (
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "payment"}
            onClick={() => setSubTab("payment")}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-medium transition-colors -mb-px",
              subTab === "payment"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            Payment Plan
          </button>
        )}
        {hasFloor && (
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "floor"}
            onClick={() => setSubTab("floor")}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-medium transition-colors -mb-px",
              subTab === "floor"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            Floor Plan
          </button>
        )}
        {hasRooms && (
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "rooms"}
            onClick={() => setSubTab("rooms")}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-medium transition-colors -mb-px",
              subTab === "rooms"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            Unit Details
          </button>
        )}
      </nav>

      <div className="p-4 sm:p-6">
        {subTab === "payment" && unit.paymentPlanUrl && (
          <PlanImageViewer src={unit.paymentPlanUrl} alt="Payment plan" />
        )}
        {subTab === "floor" && unit.floorPlanUrl && (
          <PlanImageViewer src={unit.floorPlanUrl} alt="Floor plan" />
        )}
        {subTab === "rooms" && <UnitRoomsTable unit={unit} />}
      </div>
    </div>
  );
}

export function ProjectUnitsSection({
  projectId,
  projectSlug,
  units: initialUnits,
  installmentMonths,
}: {
  projectId: number;
  projectSlug: string;
  units: ProjectUnit[];
  installmentMonths?: number | null;
}) {
  const [units, setUnits] = useState(initialUnits);
  const [unitId, setUnitId] = useState(initialUnits[0]?.id ?? 0);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [compareMsg, setCompareMsg] = useState<string | null>(null);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [sectionVisible, setSectionVisible] = useState(false);

  const shouldLazyLoad =
    initialUnits.length > LAZY_UNIT_THRESHOLD &&
    !initialUnits.some((u) => u.roomBreakdown.length > 0);

  useEffect(() => {
    if (!shouldLazyLoad) {
      setSectionVisible(true);
      return;
    }
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setSectionVisible(true);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLazyLoad]);

  function addUnitToCompare() {
    if (!unitId) return;
    const result = requestAddCompareWithUnit(projectId, projectSlug, unitId);
    if (result.rejected) {
      return;
    }
    setCompareMsg("Added to compare. Open Compare to see unit vs unit.");
  }

  const selected = useMemo(
    () => units.find((u) => u.id === unitId) ?? units[0],
    [units, unitId]
  );

  const hasServerRooms = initialUnits.some((u) => u.roomBreakdown.length > 0);

  useEffect(() => {
    if (!sectionVisible || hasServerRooms || !initialUnits.length || detailsLoaded) return;

    let cancelled = false;
    (async () => {
      setLoadingRooms(true);
      try {
        const res = await fetch(`/api/v1/units?project_id=${projectId}`);
        if (!res.ok || cancelled) return;
        const raw = (await res.json()) as Array<{ id: number }>;
        const enriched: ProjectUnit[] = [];
        for (const row of raw ?? []) {
          const uRes = await apiFetch("/api/v1/unit-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: row.id }),
          });
          if (uRes.ok) {
            const u = (await uRes.json()) as ProjectUnit;
            if (u?.id) {
              const prev = initialUnits.find((x) => x.id === u.id);
              enriched.push({
                ...u,
                paymentPlanUrl: prev?.paymentPlanUrl ?? u.paymentPlanUrl,
                floorPlanUrl: prev?.floorPlanUrl ?? u.floorPlanUrl,
              });
            }
          }
        }
        if (!cancelled && enriched.length) {
          setUnits(enriched);
          setDetailsLoaded(true);
        }
      } finally {
        if (!cancelled) setLoadingRooms(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sectionVisible, hasServerRooms, initialUnits, projectId, detailsLoaded]);

  if (!units.length) {
    return (
      <p className="text-sm text-zinc-500">No units listed. Contact for availability.</p>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
    >
      {/* Unit type tabs — legacy style */}
      <div className="border-b border-zinc-200 bg-zinc-50/50">
        <div className="flex overflow-x-auto">
          {units.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setUnitId(u.id)}
              className={cn(
                "shrink-0 border-b-2 px-5 py-3 text-sm font-medium transition-colors",
                unitId === u.id
                  ? "border-zinc-900 bg-white text-zinc-900"
                  : "border-transparent text-zinc-500 hover:bg-white/80 hover:text-zinc-800"
              )}
            >
              {u.title ?? `Unit ${u.id}`}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={addUnitToCompare}
          >
            <GitCompare className="h-4 w-4" />
            Compare this unit
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/compare">Open compare</Link>
          </Button>
        </div>
        {compareMsg && (
          <p className="mb-4 text-sm text-zinc-600">{compareMsg}</p>
        )}
        {shouldLazyLoad && !sectionVisible ? (
          <p className="mb-4 text-sm text-zinc-500">Unit details load when you scroll here.</p>
        ) : null}
        {loadingRooms && (
          <LoadingState size="sm" label="Loading unit details…" className="mb-4" />
        )}
        {selected && (
          <UnitPanel unit={selected} installmentMonths={installmentMonths} />
        )}
      </div>
    </section>
  );
}
