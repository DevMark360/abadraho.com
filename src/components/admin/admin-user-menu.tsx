"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { ChevronDown, User } from "lucide-react";

export function AdminUserMenu() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Account");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.admin?.name) setLabel(j.admin.name);
        else if (j.admin?.email) setLabel(j.admin.email);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <User className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        <span className="max-w-[10rem] truncate">{label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[11rem] rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg"
        >
          <li>
            <Link
              href="/admin/admin-profile"
              prefetch={false}
              className="block px-4 py-2 text-zinc-700 hover:bg-zinc-50"
              onClick={() => setOpen(false)}
            >
              Edit profile
            </Link>
          </li>
          <li>
            <Link
              href="/admin/admin-change-password"
              prefetch={false}
              className="block px-4 py-2 text-zinc-700 hover:bg-zinc-50"
              onClick={() => setOpen(false)}
            >
              Change password
            </Link>
          </li>
          <li className="border-t border-zinc-100 px-3 py-2">
            <AdminLogoutButton className="w-full rounded-md bg-zinc-100 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-200" />
          </li>
        </ul>
      )}
    </div>
  );
}
