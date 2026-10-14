import { columnExists, tableExists } from "@/lib/db-table-exists";
import { isDatabaseEnabled } from "@/lib/db";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import type { ProjectUnit } from "@/types/project-detail";

/**
 * Room groups: a unit with more than one layout / floor (e.g. "Ground floor", "First floor")
 * splits its rooms into named groups. Stored in unit_room_groups plus room_type_unit.room_group_id,
 * both through raw SQL (see prisma/manual-migrations/2026-10-14-unit-room-groups.sql).
 */

const TABLE = "unit_room_groups";
export const MAX_GROUP_NAME = 100;
export const MAX_GROUPS_PER_UNIT = 10;

export type RoomGroup = { id: number; name: string };

export class RoomGroupError extends Error {}

/** True once the SQL has been applied (checked once per process; restart after applying). */
export async function roomGroupsReady(): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;
  try {
    return (await tableExists(TABLE)) && (await columnExists("room_type_unit", "room_group_id"));
  } catch {
    return false;
  }
}

async function requireReady() {
  if (!(await roomGroupsReady())) {
    throw new RoomGroupError("Room groups are not set up yet. Run the unit room groups SQL, then restart the app.");
  }
}

function cleanName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (!name) throw new RoomGroupError("Give the group a name");
  if (name.length > MAX_GROUP_NAME) throw new RoomGroupError(`Keep the name under ${MAX_GROUP_NAME} characters`);
  return name;
}

type GroupRow = { id: unknown; unit_id: unknown; name: string };

async function groupsOfUnits(unitIds: number[]): Promise<GroupRow[]> {
  if (!unitIds.length) return [];
  return queryRaw<GroupRow[]>(
    `SELECT id, unit_id, name FROM ${TABLE}
     WHERE unit_id IN (${unitIds.map(() => "?").join(",")})
     ORDER BY sort_order ASC, id ASC`,
    ...unitIds
  );
}

async function groupBelongsToUnit(unitId: number, groupId: number): Promise<boolean> {
  const rows = await queryRaw<{ id: unknown }[]>(
    `SELECT id FROM ${TABLE} WHERE id = ? AND unit_id = ? LIMIT 1`,
    groupId,
    unitId
  );
  return rows.length > 0;
}

/** Admin: the unit's groups in order, and each room's group. `enabled` is false before the SQL. */
export async function loadAdminRoomGroups(unitId: number): Promise<{
  enabled: boolean;
  groups: RoomGroup[];
  roomGroupIds: Map<number, number>;
}> {
  if (!(await roomGroupsReady())) return { enabled: false, groups: [], roomGroupIds: new Map() };
  const [groups, rooms] = await Promise.all([
    groupsOfUnits([unitId]),
    queryRaw<{ id: unknown; room_group_id: unknown }[]>(
      `SELECT id, room_group_id FROM room_type_unit
       WHERE unit_id = ? AND is_archive = 0 AND room_group_id IS NOT NULL`,
      unitId
    ),
  ]);
  const ids = new Set(groups.map((g) => Number(g.id)));
  return {
    enabled: true,
    groups: groups.map((g) => ({ id: Number(g.id), name: g.name })),
    roomGroupIds: new Map(
      rooms.filter((r) => ids.has(Number(r.room_group_id))).map((r) => [Number(r.id), Number(r.room_group_id)])
    ),
  };
}

export async function createRoomGroup(unitId: number, rawName: unknown): Promise<RoomGroup> {
  await requireReady();
  const name = cleanName(rawName);
  const existing = await groupsOfUnits([unitId]);
  if (existing.length >= MAX_GROUPS_PER_UNIT) {
    throw new RoomGroupError(`A unit can have at most ${MAX_GROUPS_PER_UNIT} groups`);
  }
  if (existing.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
    throw new RoomGroupError("This unit already has a group with that name");
  }
  await executeRaw(`INSERT INTO ${TABLE} (unit_id, name, sort_order) VALUES (?, ?, ?)`, unitId, name, existing.length);
  const rows = await queryRaw<{ id: unknown }[]>(
    `SELECT id FROM ${TABLE} WHERE unit_id = ? AND name = ? ORDER BY id DESC LIMIT 1`,
    unitId,
    name
  );
  return { id: Number(rows[0]?.id), name };
}

export async function renameRoomGroup(unitId: number, groupId: number, rawName: unknown): Promise<void> {
  await requireReady();
  const name = cleanName(rawName);
  const existing = await groupsOfUnits([unitId]);
  if (!existing.some((g) => Number(g.id) === groupId)) throw new RoomGroupError("Group not found");
  if (existing.some((g) => Number(g.id) !== groupId && g.name.toLowerCase() === name.toLowerCase())) {
    throw new RoomGroupError("This unit already has a group with that name");
  }
  await executeRaw(`UPDATE ${TABLE} SET name = ? WHERE id = ? AND unit_id = ?`, name, groupId, unitId);
}

/** Moves a group one place up or down; the order is what visitors see. */
export async function moveRoomGroup(unitId: number, groupId: number, direction: "up" | "down"): Promise<void> {
  await requireReady();
  const ids = (await groupsOfUnits([unitId])).map((g) => Number(g.id));
  const from = ids.indexOf(groupId);
  if (from < 0) throw new RoomGroupError("Group not found");
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  // Rewrites the whole order (a handful of rows), which also repairs gaps or duplicates.
  for (const [index, id] of ids.entries()) {
    await executeRaw(`UPDATE ${TABLE} SET sort_order = ? WHERE id = ? AND unit_id = ?`, index, id, unitId);
  }
}

/** Deletes a group; its rooms stay on the unit, just without a group. */
export async function deleteRoomGroup(unitId: number, groupId: number): Promise<void> {
  await requireReady();
  if (!(await groupBelongsToUnit(unitId, groupId))) throw new RoomGroupError("Group not found");
  await executeRaw(
    `UPDATE room_type_unit SET room_group_id = NULL WHERE unit_id = ? AND room_group_id = ?`,
    unitId,
    groupId
  );
  await executeRaw(`DELETE FROM ${TABLE} WHERE id = ? AND unit_id = ?`, groupId, unitId);
}

/** Turning "more than one layout" off: every group goes, every room is kept. */
export async function clearRoomGroups(unitId: number): Promise<void> {
  await requireReady();
  await executeRaw(`UPDATE room_type_unit SET room_group_id = NULL WHERE unit_id = ?`, unitId);
  await executeRaw(`DELETE FROM ${TABLE} WHERE unit_id = ?`, unitId);
}

/** Puts one room of the unit in a group, or takes it out with `groupId` null. */
export async function assignRoomGroup(unitId: number, roomId: number, groupId: number | null): Promise<void> {
  await requireReady();
  if (groupId != null && !(await groupBelongsToUnit(unitId, groupId))) throw new RoomGroupError("Group not found");
  const changed = await executeRaw(
    `UPDATE room_type_unit SET room_group_id = ? WHERE id = ? AND unit_id = ? AND is_archive = 0`,
    groupId,
    roomId,
    unitId
  );
  if (!changed) {
    const rows = await queryRaw<{ id: unknown }[]>(
      `SELECT id FROM room_type_unit WHERE id = ? AND unit_id = ? AND is_archive = 0 LIMIT 1`,
      roomId,
      unitId
    );
    if (!rows.length) throw new RoomGroupError("Room not found");
  }
}

/** Checks a group id sent with new rooms; null when there is none or groups aren't set up. */
export async function resolveNewRoomGroup(unitId: number, groupId: unknown): Promise<number | null> {
  const id = Number(groupId);
  if (groupId == null || groupId === "" || !Number.isInteger(id) || id <= 0) return null;
  await requireReady();
  if (!(await groupBelongsToUnit(unitId, id))) throw new RoomGroupError("Group not found");
  return id;
}

/** Highest room id of the unit now; rooms created after it are the "new" ones. */
export async function lastRoomId(unitId: number): Promise<number> {
  const rows = await queryRaw<{ max_id: unknown }[]>(
    `SELECT MAX(id) AS max_id FROM room_type_unit WHERE unit_id = ?`,
    unitId
  );
  return Number(rows[0]?.max_id ?? 0) || 0;
}

/** Puts the rooms created after `afterRoomId` in the group (bulk add from the floor plan reader). */
export async function assignNewRooms(unitId: number, afterRoomId: number, groupId: number): Promise<void> {
  await executeRaw(
    `UPDATE room_type_unit SET room_group_id = ?
     WHERE unit_id = ? AND id > ? AND room_group_id IS NULL AND is_archive = 0`,
    groupId,
    unitId,
    afterRoomId
  );
}

/**
 * Visitor side: adds `roomGroups` and each room's `groupId` to the units that have groups.
 * Units without groups, or a database without the SQL, are left exactly as they were.
 */
export async function attachRoomGroups(units: ProjectUnit[]): Promise<void> {
  if (!units.length || !(await roomGroupsReady())) return;
  try {
    const groups = await groupsOfUnits(units.map((u) => u.id));
    if (!groups.length) return;
    const groupIds = groups.map((g) => Number(g.id));
    const rooms = await queryRaw<{ id: unknown; room_group_id: unknown }[]>(
      `SELECT id, room_group_id FROM room_type_unit
       WHERE room_group_id IN (${groupIds.map(() => "?").join(",")}) AND is_archive = 0`,
      ...groupIds
    );
    const groupOfRoom = new Map(rooms.map((r) => [Number(r.id), Number(r.room_group_id)]));

    for (const unit of units) {
      const own = groups.filter((g) => Number(g.unit_id) === unit.id);
      if (!own.length) continue;
      unit.roomGroups = own.map((g) => ({ id: Number(g.id), name: g.name }));
      for (const room of unit.roomBreakdown) {
        room.groupId = room.id != null ? (groupOfRoom.get(room.id) ?? null) : null;
      }
    }
  } catch (e) {
    console.error("[room-groups] attach failed", e);
  }
}
