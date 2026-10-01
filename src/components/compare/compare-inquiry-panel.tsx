"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { InquiryForm } from "@/components/project-detail/inquiry-form";
import type { ProjectUnit } from "@/types/project-detail";

function toInquiryUnit(row: Record<string, unknown>): ProjectUnit {
  return {
    id: Number(row.id),
    title: row.title != null ? String(row.title) : null,
    name: row.title != null ? String(row.title) : null,
    unitType: null,
    grossArea: null,
    netArea: null,
    size: null,
    price: null,
    downPayment: null,
    monthlyInstallment: null,
    totalUnitAmount: null,
    loanAmount: null,
    floorPlanUrl: null,
    paymentPlanUrl: null,
    roomBreakdown: [],
  };
}

export function CompareInquiryPanel({
  projectId,
  projectName,
  unit,
  fallbackUnits = [],
}: {
  projectId: number;
  projectName: string;
  unit: ProjectUnit | null;
  fallbackUnits?: ProjectUnit[];
}) {
  const [units, setUnits] = useState<ProjectUnit[]>(() => {
    const inquiryUnit = unit ?? fallbackUnits[0] ?? null;
    return inquiryUnit ? [inquiryUnit] : [];
  });
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    const fromCompare = unit ?? fallbackUnits[0] ?? null;
    if (fromCompare) {
      setUnits([fromCompare]);
      return;
    }

    let cancelled = false;
    setLoadingUnits(true);
    fetch(`/api/v1/units?project_id=${projectId}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows)
          ? rows.map((row) => toInquiryUnit(row as Record<string, unknown>))
          : [];
        setUnits(list);
      })
      .catch(() => {
        if (!cancelled) setUnits([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingUnits(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, unit, fallbackUnits]);

  if (loadingUnits) {
    return <LoadingState size="sm" label="Loading inquiry form…" />;
  }

  if (!units.length) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-center">
        <h3 className="font-semibold text-zinc-900">{projectName}</h3>
        <p className="mt-2 text-sm text-zinc-500">
          No units available to submit an inquiry for this project.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-zinc-700">{projectName}</p>
      <InquiryForm projectId={projectId} units={units} />
    </div>
  );
}
