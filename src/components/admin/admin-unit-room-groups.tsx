"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AdminRoomGroup = { id: number; name: string };

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    return json.success ? null : (json.message ?? "Something went wrong");
  } catch {
    return "Could not reach the server";
  }
}

/** Compact on/off switch for the "Unit rooms" header. */
export function RoomGroupsSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={cn("flex items-center gap-3", disabled ? "opacity-60" : "cursor-pointer")}>
      <span className="text-sm font-medium normal-case tracking-normal text-zinc-700">
        More than one layout / floor
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-accent" : "bg-zinc-300"
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </label>
  );
}

/** Add, rename, reorder and delete the unit's room groups (e.g. Ground floor, First floor). */
export function AdminRoomGroupsManager({
  unitId,
  groups,
  roomCounts,
  onChanged,
}: {
  unitId: number;
  groups: AdminRoomGroup[];
  roomCounts: Map<number, number>;
  onChanged: (created?: AdminRoomGroup) => Promise<void> | void;
}) {
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(action: () => Promise<string | null>, created?: () => AdminRoomGroup | undefined) {
    setBusy(true);
    setMessage("");
    const error = await action();
    if (error) setMessage(error);
    else await onChanged(created?.());
    setBusy(false);
    return !error;
  }

  async function addGroup(name: string) {
    let group: AdminRoomGroup | undefined;
    const ok = await run(
      async () => {
        try {
          const res = await fetch(`/api/admin/units/${unitId}/room-groups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          const json = (await res.json().catch(() => ({}))) as {
            success?: boolean;
            message?: string;
            group?: AdminRoomGroup;
          };
          if (!json.success) return json.message ?? "Could not add the group";
          group = json.group;
          return null;
        } catch {
          return "Could not reach the server";
        }
      },
      () => group
    );
    if (ok) setNewName("");
  }

  async function saveRename(id: number) {
    const ok = await run(() => send(`/api/admin/units/${unitId}/room-groups/${id}`, "PATCH", { name: renameValue }));
    if (ok) setRenamingId(null);
  }

  function removeGroup(group: AdminRoomGroup) {
    const count = roomCounts.get(group.id) ?? 0;
    const note = count ? ` Its ${count} ${count === 1 ? "room stays" : "rooms stay"} on the unit without a group.` : "";
    if (!confirm(`Delete the group "${group.name}"?${note}`)) return;
    void run(() => send(`/api/admin/units/${unitId}/room-groups/${group.id}`, "DELETE"));
  }

  const suggestions = ["Ground floor", "First floor", "Second floor"].filter(
    (s) => !groups.some((g) => g.name.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="rounded-xl bg-clay-well p-4 shadow-clay-inset">
      <p className="text-sm font-semibold text-zinc-800">Groups</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Visitors see the rooms under these headings, in this order, inside Unit Details.
      </p>

      {groups.length ? (
        <ul className="mt-3 space-y-2">
          {groups.map((group, index) => (
            <li
              key={group.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2"
            >
              {renamingId === group.id ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input
                    layout="field"
                    value={renameValue}
                    maxLength={100}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveRename(group.id);
                      }
                    }}
                    className="max-w-xs"
                    autoFocus
                  />
                  <Button type="button" size="sm" disabled={busy} onClick={() => void saveRename(group.id)}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setRenamingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm">
                    <strong className="text-zinc-900">{group.name}</strong>
                    <span className="ml-2 text-zinc-500">
                      {roomCounts.get(group.id) ?? 0} {(roomCounts.get(group.id) ?? 0) === 1 ? "room" : "rooms"}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`Move ${group.name} up`}
                      disabled={busy || index === 0}
                      onClick={() => void run(() => send(`/api/admin/units/${unitId}/room-groups/${group.id}`, "PATCH", { move: "up" }))}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`Move ${group.name} down`}
                      disabled={busy || index === groups.length - 1}
                      onClick={() => void run(() => send(`/api/admin/units/${unitId}/room-groups/${group.id}`, "PATCH", { move: "down" }))}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setRenamingId(group.id);
                        setRenameValue(group.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      disabled={busy}
                      onClick={() => removeGroup(group)}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          layout="field"
          value={newName}
          maxLength={100}
          placeholder="Group name, e.g. Ground floor"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (newName.trim()) void addGroup(newName);
            }
          }}
          className="max-w-xs"
        />
        <Button type="button" size="sm" disabled={busy || !newName.trim()} onClick={() => void addGroup(newName)}>
          Add group
        </Button>
        {suggestions.length ? <span className="text-xs text-zinc-500">or quick add:</span> : null}
        {suggestions.map((name) => (
          <Button key={name} type="button" size="sm" variant="outline" disabled={busy} onClick={() => void addGroup(name)}>
            {name}
          </Button>
        ))}
      </div>

      {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
    </div>
  );
}
