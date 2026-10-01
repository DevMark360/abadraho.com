"use client";

import { useRouter } from "next/navigation";

export function AdminLogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await Promise.all([
          fetch("/api/admin/auth/logout", { method: "POST" }),
          fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" }),
        ]);
        router.push("/login");
        router.refresh();
      }}
      className={
        className ||
        "w-full rounded-lg border border-zinc-200 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
      }
    >
      Log out
    </button>
  );
}
