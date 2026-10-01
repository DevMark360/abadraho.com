import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEventFormClient } from "@/components/admin/admin-event-form-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const eventId = Number(id);

  return (
    <AdminShell title="Edit event">
      <AdminEventFormClient mode="edit" eventId={eventId} />
    </AdminShell>
  );
}
