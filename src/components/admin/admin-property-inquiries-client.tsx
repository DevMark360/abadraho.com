"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Eye, Trash2 } from "lucide-react";
import { AdminMultiSelect } from "@/components/admin/admin-multi-select";
import { Input } from "@/components/ui/input";
import { AdminDbAlert, AdminPageToolbar, AdminPagination, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { fmtDate } from "@/components/admin/admin-search-history-format";

const PER_PAGE = 25;

type Row = {
  rowNum: number;
  id: number;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  projectName: string | null;
  unitTitle: string | null;
  createdAt: string | null;
};

export function AdminPropertyInquiriesClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullStaff, setIsFullStaff] = useState(true);
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([]);
  const [units, setUnits] = useState<{ value: string; label: string }[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<URLSearchParams>(new URLSearchParams());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(applied);
    params.set("page", String(page));
    params.set("perPage", String(PER_PAGE));
    const res = await fetch(`/api/admin/inquiries?${params}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Failed to load");
      setItems([]);
      setTotal(0);
    } else {
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
      if (typeof json.isFullStaff === "boolean") setIsFullStaff(json.isFullStaff);
      if (json.projects) setProjects(json.projects);
      if (json.units) setUnits(json.units);
    }
    setLoading(false);
  }, [page, applied]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters() {
    const p = new URLSearchParams();
    if (name) p.set("name", name);
    if (email) p.set("email", email);
    if (phoneNumber) p.set("phoneNumber", phoneNumber);
    if (address) p.set("address", address);
    if (projectIds.length) p.set("projectIds", projectIds.join(","));
    if (unitIds.length) p.set("unitIds", unitIds.join(","));
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    setApplied(p);
    setPage(1);
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this inquiry?")) return;
    const res = await fetch(`/api/admin/inquiries/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total}>
        <Button asChild variant="outline" className="gap-1.5">
          <a href={`/api/admin/export/listing?${applied}`}>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </AdminPageToolbar>

      <div className={`${adminCard} relative z-20 overflow-visible`}>
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">Filter property inquiries</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Name</span>
              <Input layout="field" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            {isFullStaff ? (
              <>
                <label className="block text-sm">
                  <span className="font-medium text-zinc-700">Email</span>
                  <Input layout="field" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-zinc-700">Phone</span>
                  <Input layout="field" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-zinc-700">Address</span>
                  <Input layout="field" value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
              </>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminMultiSelect label="Project" options={projects} value={projectIds} onChange={setProjectIds} placeholder="All projects" />
            <AdminMultiSelect label="Unit" options={units} value={unitIds} onChange={setUnitIds} placeholder="All units" />
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">From</span>
              <Input layout="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">To</span>
              <Input layout="field" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={applyFilters}>Search</Button>
            <Button variant="outline" type="button" onClick={() => { setName(""); setEmail(""); setPhoneNumber(""); setAddress(""); setProjectIds([]); setUnitIds([]); setFrom(""); setTo(""); setApplied(new URLSearchParams()); setPage(1); }}>Clear</Button>
          </div>
        </div>
      </div>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Date/Time</th>
              <th className={adminTableHead}>Name</th>
              {isFullStaff ? (
                <>
                  <th className={adminTableHead}>Email</th>
                  <th className={adminTableHead}>Phone</th>
                  <th className={adminTableHead}>Address</th>
                </>
              ) : null}
              <th className={adminTableHead}>Project</th>
              <th className={adminTableHead}>Unit</th>
              <th className={adminTableHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isFullStaff ? 9 : 6} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={isFullStaff ? 9 : 6} className="px-3 py-8 text-center text-zinc-500">No inquiries</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.rowNum}</td>
                  <td className="whitespace-nowrap px-3 py-2">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2">{r.name ?? "—"}</td>
                  {isFullStaff ? (
                    <>
                      <td className="px-3 py-2">{r.email ?? "—"}</td>
                      <td className="px-3 py-2">{r.phoneNumber ?? "—"}</td>
                      <td className="px-3 py-2">{r.address ?? "—"}</td>
                    </>
                  ) : null}
                  <td className="px-3 py-2">{r.projectName ?? "—"}</td>
                  <td className="px-3 py-2">{r.unitTitle ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Link href={`/admin/inquiries/${r.id}`} className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100" title="View"><Eye className="h-4 w-4" /></Link>
                      <AdminCan module="inquiries" action="delete">
                        <button type="button" className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Delete" onClick={() => onDelete(r.id)}><Trash2 className="h-4 w-4" /></button>
                      </AdminCan>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <AdminPagination page={page} totalPages={Math.max(1, Math.ceil(total / PER_PAGE))} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
      </div>
    </div>
  );
}
