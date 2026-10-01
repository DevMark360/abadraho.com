"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Eye } from "lucide-react";
import { AdminDbAlert, AdminPageToolbar, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { fmtDate } from "@/components/admin/admin-search-history-format";

type Row = {
  rowNum: number;
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  createdAt: string | null;
};

export function AdminContactInquiriesClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<URLSearchParams>(new URLSearchParams());

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/contact?${applied}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? "Failed to load");
      setItems([]);
    } else {
      setError(null);
      setItems(json.items ?? []);
    }
    setLoading(false);
  }, [applied]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters() {
    const p = new URLSearchParams();
    if (name) p.set("name", name);
    if (email) p.set("email", email);
    if (phone) p.set("phone", phone);
    if (subject) p.set("subject", subject);
    if (message) p.set("message", message);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    setApplied(p);
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={items.length}>
        <Button asChild variant="outline" className="gap-1.5">
          <a href={`/api/admin/export/contact?${applied}`}>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </AdminPageToolbar>

      <div className={adminCard}>
        <div className="grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
          <Input layout="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input layout="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input layout="field" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input layout="field" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Input layout="field" placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Input layout="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input layout="field" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="flex gap-2">
            <Button type="button" onClick={applyFilters}>
              Search
            </Button>
            <Button type="button" variant="outline" onClick={() => {
              setName("");
              setEmail("");
              setPhone("");
              setSubject("");
              setMessage("");
              setFrom("");
              setTo("");
              setApplied(new URLSearchParams());
            }}>
              Reset
            </Button>
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
              <th className={adminTableHead}>Email</th>
              <th className={adminTableHead}>Phone</th>
              <th className={adminTableHead}>Subject</th>
              <th className={adminTableHead}>Message</th>
              <th className={adminTableHead}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-zinc-500">No inquiries</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.rowNum}</td>
                  <td className="whitespace-nowrap px-3 py-2">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2">{r.name ?? "—"}</td>
                  <td className="px-3 py-2">{r.email ?? "—"}</td>
                  <td className="px-3 py-2">{r.phone ?? "—"}</td>
                  <td className="max-w-[10rem] truncate px-3 py-2" title={r.subject ?? ""}>{r.subject ?? "—"}</td>
                  <td className="max-w-[14rem] truncate px-3 py-2" title={r.message ?? ""}>{r.message ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/contact/${r.id}`} className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"><Eye className="h-4 w-4" /></Link>
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
