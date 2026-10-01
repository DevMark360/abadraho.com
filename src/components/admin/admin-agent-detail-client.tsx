"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { AdminBackLink, AdminDbAlert } from "@/components/admin/admin-ui";
import { AdminDetailTable } from "@/components/admin/admin-detail-table";
import { fmtDate } from "@/components/admin/admin-search-history-format";

type AgentDetail = {
  id: number;
  contactPersonName: string;
  contactEmail: string;
  contactNumber: string;
  companyName: string;
  companyAddress: string;
  agentSinceYears: number | string;
  dealsIn: string[];
  areaNames?: string[];
  userId?: number | null;
  createdAt?: string | null;
};

export function AdminAgentDetailClient({ id }: { id: number }) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [storageMode, setStorageMode] = useState<string>("brokers");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/agents/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.agent) {
          setAgent(j.agent);
          if (j.storageMode) setStorageMode(j.storageMode);
        } else setError(j.message ?? "Not found");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState size="sm" />;
  if (!agent) return <AdminDbAlert message={error ?? "Agent not found"} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminBackLink href="/admin/agents">Agents / brokers</AdminBackLink>
        <Button asChild>
          <Link href={`/admin/agents/${id}/edit`}>Edit agent</Link>
        </Button>
      </div>

      {storageMode === "users" && (
        <p className="text-sm text-amber-800">
          Agent record is stored on the users table (brokers table not available).
        </p>
      )}

      <AdminDetailTable
        title="Agent details"
        rows={[
          { label: "Contact name", value: agent.contactPersonName || "—" },
          { label: "Email", value: agent.contactEmail || "—" },
          { label: "Phone", value: agent.contactNumber || "—" },
          { label: "Company", value: agent.companyName || "—" },
          {
            label: "Company address",
            value: agent.companyAddress ? (
              <span className="whitespace-pre-wrap">{agent.companyAddress}</span>
            ) : (
              "—"
            ),
          },
          {
            label: "Agent since (year)",
            value: agent.agentSinceYears ? String(agent.agentSinceYears) : "—",
          },
          {
            label: "Deals in",
            value: agent.dealsIn?.length ? agent.dealsIn.join(", ") : "—",
          },
          {
            label: "Expertise areas",
            value: agent.areaNames?.length ? agent.areaNames.join(", ") : "—",
          },
          { label: "Linked user ID", value: agent.userId != null ? String(agent.userId) : "—" },
          { label: "Created", value: fmtDate(agent.createdAt ?? null) },
        ]}
      />
    </div>
  );
}
