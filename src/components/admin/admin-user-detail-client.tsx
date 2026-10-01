"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { AdminBackLink, AdminDbAlert } from "@/components/admin/admin-ui";
import { AdminDetailTable } from "@/components/admin/admin-detail-table";
import { fmtDate } from "@/components/admin/admin-search-history-format";

type UserDetail = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  username: string | null;
  city: string | null;
  address: string | null;
  aboutMe: string | null;
  userTypeName: string | null;
  createdAt: string | null;
};

export function AdminUserDetailClient({ id }: { id: number }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.user) setUser(j.user);
        else setError(j.message ?? "Not found");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState size="sm" />;
  if (!user) return <AdminDbAlert message={error ?? "User not found"} />;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminBackLink href="/admin/users">User listing</AdminBackLink>
        <Button asChild>
          <Link href={`/admin/users/${id}/edit`}>Edit user</Link>
        </Button>
      </div>

      <AdminDetailTable
        title="User management details"
        rows={[
          { label: "Name", value: fullName || "—" },
          { label: "Email", value: user.email ?? "—" },
          { label: "Phone", value: user.phoneNumber ?? "—" },
          { label: "Username", value: user.username ?? "—" },
          { label: "Role", value: user.userTypeName ?? "—" },
          { label: "City", value: user.city ?? "—" },
          { label: "Address", value: user.address ?? "—" },
          {
            label: "About",
            value: user.aboutMe ? (
              <span className="whitespace-pre-wrap">{user.aboutMe}</span>
            ) : (
              "—"
            ),
          },
          { label: "Created", value: fmtDate(user.createdAt) },
        ]}
      />
    </div>
  );
}
