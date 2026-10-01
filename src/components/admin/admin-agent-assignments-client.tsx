"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminBackLink, AdminPageToolbar, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminFormSection, FieldLabel } from "@/components/admin/admin-form-section";
import { AdminSelect } from "@/components/admin/admin-select";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCommissionRate } from "@/config/broker-agent";

type Assignment = {
  id: number;
  projectName: string;
  areaName: string | null;
  builderName: string | null;
  commissionType: "percentage" | "fixed";
  commissionValue: number;
  isActive: boolean;
  assignedAt: string;
};

const MODE_LABELS = {
  project: "Single project",
  area: "By area",
  builder: "By builder",
} as const;

const MODE_HINTS = {
  project: "Assign one project with a custom commission rate.",
  area: "Assign all active projects in the selected area at once.",
  builder: "Assign all active projects from the selected builder at once.",
} as const;

export function AdminAgentAssignmentsClient({ agentId }: { agentId: number }) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{ value: string; label: string }>>([]);
  const [areas, setAreas] = useState<Array<{ value: string; label: string }>>([]);
  const [builders, setBuilders] = useState<Array<{ value: string; label: string }>>([]);
  const [mode, setMode] = useState<"project" | "area" | "builder">("project");
  const [projectId, setProjectId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [builderId, setBuilderId] = useState("");
  const [commissionType, setCommissionType] = useState<"percentage" | "fixed">("percentage");
  const [commissionValue, setCommissionValue] = useState("2.5");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [aRes, metaRes, pRes, agentRes] = await Promise.all([
      fetch(`/api/admin/agents/${agentId}/assignments`),
      fetch("/api/admin/meta/options"),
      fetch("/api/admin/projects?pageSize=500"),
      fetch(`/api/admin/agents/${agentId}`),
    ]);
    const a = await aRes.json();
    const meta = await metaRes.json();
    const p = await pRes.json();
    const agent = await agentRes.json();
    setItems(a.items ?? []);
    setAreas(meta.areas ?? []);
    setBuilders(meta.builders ?? []);
    setAgentName(agent.agent?.contactPersonName ?? null);
    setProjects(
      (p.items ?? p.projects ?? []).map((row: { id: number; name: string }) => ({
        value: String(row.id),
        label: row.name,
      }))
    );
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  const canAssign = useMemo(() => {
    const value = Number(commissionValue);
    if (!Number.isFinite(value) || value <= 0) return false;
    if (mode === "project") return Boolean(projectId);
    if (mode === "area") return Boolean(areaId);
    return Boolean(builderId);
  }, [mode, projectId, areaId, builderId, commissionValue]);

  async function assign() {
    if (!canAssign) return;
    setAssigning(true);
    const body: Record<string, unknown> = {
      mode,
      commissionType,
      commissionValue: Number(commissionValue),
      notes: notes.trim() || undefined,
    };
    if (mode === "project") body.projectId = Number(projectId);
    if (mode === "area") body.areaId = Number(areaId);
    if (mode === "builder") body.builderId = Number(builderId);
    const res = await fetch(`/api/admin/agents/${agentId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setAssigning(false);
    if (!json.success) {
      alert(json.message ?? "Assign failed");
      return;
    }
    if (mode !== "project" && json.assigned != null) {
      alert(`Assigned ${json.assigned} project${json.assigned === 1 ? "" : "s"}.`);
    }
    setNotes("");
    load();
  }

  async function toggleActive(row: Assignment) {
    await fetch(`/api/admin/agents/${agentId}/assignments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: row.id, isActive: !row.isActive }),
    });
    load();
  }

  async function removeAssignment(row: Assignment) {
    if (!confirm(`Remove assignment for "${row.projectName}"?`)) return;
    await fetch(`/api/admin/agents/${agentId}/assignments?assignmentId=${row.id}`, {
      method: "DELETE",
    });
    load();
  }

  const activeCount = items.filter((row) => row.isActive).length;

  const targetLabel = mode === "project" ? "Project" : mode === "area" ? "Area" : "Builder";

  function renderTargetSelect() {
    if (mode === "project") {
      return (
        <AdminSelect
          value={projectId}
          onChange={setProjectId}
          placeholder="Select project"
          options={[{ value: "", label: "Select project" }, ...projects]}
        />
      );
    }
    if (mode === "area") {
      return (
        <AdminSelect
          value={areaId}
          onChange={setAreaId}
          placeholder="Select area"
          options={[{ value: "", label: "Select area" }, ...areas]}
        />
      );
    }
    return (
      <AdminSelect
        value={builderId}
        onChange={setBuilderId}
        placeholder="Select builder"
        options={[{ value: "", label: "Select builder" }, ...builders]}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <AdminBackLink href={`/admin/agents/${agentId}`}>Agent detail</AdminBackLink>

      {agentName ? (
        <p className="text-sm text-zinc-500">
          Assign projects and commission rates for{" "}
          <span className="font-medium text-zinc-700">{agentName}</span>.
        </p>
      ) : null}

      <AdminFormSection title="New assignment">
        <p className="text-sm text-zinc-500">{MODE_HINTS[mode]}</p>

        <div className="inline-flex max-w-full flex-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-1">
          {(["project", "area", "builder"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <FieldLabel required>{targetLabel}</FieldLabel>
            {renderTargetSelect()}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel required>Commission type</FieldLabel>
              <AdminSelect
                value={commissionType}
                onChange={(v) => setCommissionType(v as "percentage" | "fixed")}
                options={[
                  { value: "percentage", label: "Percentage" },
                  { value: "fixed", label: "Fixed amount (PKR)" },
                ]}
              />
            </div>

            <div>
              <FieldLabel
                required
                // hint={commissionType === "percentage" ? "e.g. 2.5 for 2.5%" : "Amount in PKR"}
              >
                Commission value
              </FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                layout="field"
                value={commissionValue}
                onChange={(e) => setCommissionValue(e.target.value)}
                placeholder={commissionType === "percentage" ? "2.5" : "50000"}
              />
            </div>
          </div>

          <div>
            <FieldLabel hint="Optional">Notes</FieldLabel>
            <Input
              layout="field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Special rate for launch period"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
          <Button type="button" disabled={!canAssign || assigning} onClick={assign}>
            {assigning ? "Assigning…" : mode === "project" ? "Assign project" : "Assign projects"}
          </Button>
          {!canAssign ? (
            <p className="text-xs text-zinc-400">Pick a {targetLabel.toLowerCase()} and commission rate.</p>
          ) : null}
        </div>
      </AdminFormSection>

      <AdminPageToolbar
        total={items.length}
        hint={activeCount !== items.length ? `${activeCount} active` : undefined}
      />

      <div className={`${adminCard} overflow-x-auto`}>
        <table className="min-w-[720px] w-full text-left text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>Project</th>
                <th className={adminTableHead}>Area</th>
                <th className={adminTableHead}>Builder</th>
                <th className={adminTableHead}>Commission</th>
                <th className={adminTableHead}>Assigned</th>
                <th className={adminTableHead}>Status</th>
                <th className={`${adminTableHead} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10">
                    <LoadingState size="sm" inline className="w-full" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No assignments yet. Use the form above to assign projects to this agent.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                    <td className="max-w-[240px] px-4 py-3">
                      <span className="line-clamp-2 font-medium text-zinc-900" title={row.projectName}>
                        {row.projectName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{row.areaName ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{row.builderName ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-800">
                      {formatCommissionRate(row.commissionType, row.commissionValue)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {new Date(row.assignedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.isActive ? "success" : "muted"}>
                        {row.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(row)}
                        >
                          {row.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => removeAssignment(row)}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
}
