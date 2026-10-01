import { adminCard } from "@/components/admin/admin-ui";

export function AdminDetailTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: React.ReactNode }[];
}) {
  return (
    <div className={adminCard}>
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold text-zinc-900">{title}</h2>
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500">
            <th className="w-1/3 px-4 py-2">Field</th>
            <th className="px-4 py-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-zinc-100">
              <th className="bg-zinc-50/50 px-4 py-3 font-medium text-zinc-700">{row.label}</th>
              <td className="px-4 py-3 text-zinc-900">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
