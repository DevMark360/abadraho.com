"use client";

import { useMemo } from "react";
import {
  ADMIN_PERMISSION_GROUPS,
  PERMISSION_ACTION_LABELS,
  permissionKey,
  type PermissionAction,
} from "@/config/admin-permissions";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
};

export function AdminPermissionsMatrix({ value, onChange, disabled }: Props) {
  const selected = useMemo(() => new Set(value), [value]);

  function toggle(key: string) {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  }

  function setModuleKeys(moduleKey: string, actions: readonly PermissionAction[], on: boolean) {
    if (disabled) return;
    const next = new Set(selected);
    for (const action of actions) {
      const key = permissionKey(moduleKey, action);
      if (on) next.add(key);
      else next.delete(key);
    }
    onChange([...next]);
  }

  function moduleAllChecked(moduleKey: string, actions: readonly PermissionAction[]) {
    return actions.every((a) => selected.has(permissionKey(moduleKey, a)));
  }

  function moduleSomeChecked(moduleKey: string, actions: readonly PermissionAction[]) {
    return actions.some((a) => selected.has(permissionKey(moduleKey, a)));
  }

  return (
    <div className="space-y-6">
      {ADMIN_PERMISSION_GROUPS.map((group) => (
        <div key={group.key} className="rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay">
          <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-zinc-800">{group.label}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                  <th className="px-4 py-2 font-medium">Module</th>
                  <th className="px-3 py-2 font-medium">
                    <span title="Check to select every action in the row">All row</span>
                  </th>
                  {(["view", "add", "edit", "delete", "approve", "reject", "export"] as const).map(
                    (action) => (
                      <th key={action} className="px-2 py-2 font-medium text-center">
                        {PERMISSION_ACTION_LABELS[action]}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {group.modules.map((mod) => {
                  const allOn = moduleAllChecked(mod.key, mod.actions);
                  const someOn = moduleSomeChecked(mod.key, mod.actions);
                  return (
                    <tr key={mod.key} className="border-t border-zinc-50">
                      <td className="px-4 py-2 font-medium text-zinc-800">{mod.label}</td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={allOn}
                            ref={(el) => {
                              if (el) el.indeterminate = !allOn && someOn;
                            }}
                            disabled={disabled}
                            onChange={(e) => setModuleKeys(mod.key, mod.actions, e.target.checked)}
                            className="h-4 w-4 rounded border-zinc-300"
                            aria-label={`All permissions for ${mod.label}`}
                            title={
                              allOn
                                ? "All actions selected"
                                : someOn
                                  ? "Some actions selected — not the same as All"
                                  : "No actions selected"
                            }
                          />
                          {!allOn && someOn ? (
                            <span className="text-[10px] font-medium text-zinc-400">Some</span>
                          ) : null}
                        </label>
                      </td>
                      {(["view", "add", "edit", "delete", "approve", "reject", "export"] as const).map(
                        (action) => {
                          const hasAction = (mod.actions as readonly string[]).includes(action);
                          const key = permissionKey(mod.key, action);
                          return (
                            <td key={action} className="px-2 py-2 text-center">
                              {hasAction ? (
                                <input
                                  type="checkbox"
                                  checked={selected.has(key)}
                                  disabled={disabled}
                                  onChange={() => toggle(key)}
                                  className={cn(
                                    "h-4 w-4 rounded border-zinc-300",
                                    disabled && "opacity-50"
                                  )}
                                  aria-label={`${mod.label} ${PERMISSION_ACTION_LABELS[action]}`}
                                />
                              ) : (
                                <span className="text-zinc-200">—</span>
                              )}
                            </td>
                          );
                        }
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
