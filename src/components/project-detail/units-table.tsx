import { designTw } from "@/config/design-tokens";
import { formatPrice } from "@/lib/utils";
import type { ProjectUnit } from "@/types/project-detail";

export function UnitsTable({ units }: { units: ProjectUnit[] }) {
  if (!units.length) {
    return (
      <p className="text-sm text-zinc-500">No units listed. Contact for availability.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className={designTw.tableHead}>Unit</th>
            <th className={designTw.tableHead}>Price</th>
            <th className={designTw.tableHead}>Down payment</th>
            <th className={designTw.tableHead}>Monthly</th>
            <th className={designTw.tableHead}>Size</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id} className="border-b border-zinc-50 last:border-0">
              <td className="px-4 py-3 font-medium text-zinc-900">
                {u.title ?? u.name ?? `#${u.id}`}
              </td>
              <td className="px-4 py-3">{u.price ? formatPrice(u.price) : "—"}</td>
              <td className="px-4 py-3">
                {u.downPayment ? formatPrice(u.downPayment) : "—"}
              </td>
              <td className="px-4 py-3">
                {u.monthlyInstallment ? formatPrice(u.monthlyInstallment) : "—"}
              </td>
              <td className="px-4 py-3">
                {u.size ? `${u.size} sqft` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
