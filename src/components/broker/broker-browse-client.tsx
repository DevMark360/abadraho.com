"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { BrokerGate } from "@/components/broker/broker-gate";
import { BrokerSubpageShell, brokerPageIcon } from "@/components/broker/broker-subpage-shell";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

type Project = {
  id: number;
  name: string;
  slug: string;
  isAssigned: boolean;
  isPendingRequest?: boolean;
};

export function BrokerBrowseClient() {
  const [tab, setTab] = useState<"area" | "builder">("area");
  const [byArea, setByArea] = useState<Array<{ name: string; count: number; projects: Project[] }>>([]);
  const [byBuilder, setByBuilder] = useState<Array<{ name: string; count: number; projects: Project[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Project | null>(null);
  const [message, setMessage] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/broker/ops?resource=browse", { credentials: "same-origin" });
    const j = await res.json();
    const area = j.byArea ?? [];
    const builder = j.byBuilder ?? [];
    const pending = new Set<number>();
    for (const g of area) for (const p of g.projects) if (p.isPendingRequest) pending.add(p.id);
    for (const g of builder) for (const p of g.projects) if (p.isPendingRequest) pending.add(p.id);
    setByArea(area);
    setByBuilder(builder);
    setPendingIds(pending);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitRequest() {
    if (!modal) return;
    await fetch("/api/v1/broker/ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request-assignment", projectId: modal.id, message }),
    });
    setPendingIds((prev) => new Set(prev).add(modal.id));
    setModal(null);
    setMessage("");
    alert("Assignment request sent to admin.");
  }

  const groups = tab === "area" ? byArea : byBuilder;

  return (
    <BrokerGate>
      <BrokerSubpageShell
        title="Browse projects"
        description="All active listings — request assignment for new projects"
        icon={brokerPageIcon(Search)}
      >
        <div className="mb-6 flex gap-2">
          <Button variant={tab === "area" ? "default" : "outline"} onClick={() => setTab("area")}>By area</Button>
          <Button variant={tab === "builder" ? "default" : "outline"} onClick={() => setTab("builder")}>By builder</Button>
        </div>
        {loading ? (
          <LoadingState size="sm" />
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.name}>
                <h2 className="text-lg font-semibold text-zinc-900">{g.name} <span className="text-sm font-normal text-zinc-500">({g.count})</span></h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {g.projects.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3">
                      <div>
                        <p className="font-medium text-zinc-900">{p.name}</p>
                        {p.isAssigned ? (
                          <span className="text-xs font-semibold text-emerald-700">Assigned ✓</span>
                        ) : null}
                      </div>
                      {!p.isAssigned ? (
                        p.isPendingRequest || pendingIds.has(p.id) ? (
                          <Button size="sm" variant="outline" disabled className="cursor-not-allowed opacity-60">
                            Pending
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setModal(p)}>
                            Request assignment
                          </Button>
                        )
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        {modal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6">
              <h3 className="font-semibold">Request: {modal.name}</h3>
              <textarea className="mt-4 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" rows={4} placeholder="Why do you want this project?" value={message} onChange={(e) => setMessage(e.target.value)} />
              <div className="mt-4 flex gap-2">
                <Button onClick={submitRequest}>Submit</Button>
                <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        ) : null}
      </BrokerSubpageShell>
    </BrokerGate>
  );
}
