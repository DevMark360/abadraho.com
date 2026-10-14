"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { AdminSelect } from "@/components/admin/admin-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ScanText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminFormSection, preventImplicitFormSubmit } from "@/components/admin/admin-form-section";
import { AdminBackLink, AdminDbAlert, AdminErrorAlert, adminCard } from "@/components/admin/admin-ui";
import { AdminFloorPlanRoomsDialog } from "@/components/admin/admin-floor-plan-rooms-dialog";
import {
  AdminRoomGroupsManager,
  RoomGroupsSwitch,
  type AdminRoomGroup,
} from "@/components/admin/admin-unit-room-groups";

type Meta = {
  projectTypes: { id: number; title: string }[];
  roomTypes: { id: number; name: string }[];
  projects: { id: number; name: string; slug: string }[];
  measurements: { id: number; name: string; convertor: number }[];
  installmentTypes: { id: number; name: string }[];
};

type UnitRoom = {
  id: number;
  roomTypeId: number;
  roomTypeName: string;
  widthFeet: number | null;
  widthInches: number | null;
  lengthFeet: number | null;
  lengthInches: number | null;
  coveredArea: number | null;
  extras: string | null;
  groupId: number | null;
};

type RoomDraft = {
  roomTypeId: string;
  widthFeet: string;
  widthInches: string;
  lengthFeet: string;
  lengthInches: string;
  extras: string;
  coveredArea: string;
};

const DEFAULT_INSTALLMENT_TYPES = [
  { id: 1, name: "Monthly" },
  { id: 2, name: "Quarterly" },
  { id: 3, name: "Half Yearly" },
];

const emptyRoomDraft = (): RoomDraft => ({
  roomTypeId: "",
  widthFeet: "",
  widthInches: "0",
  lengthFeet: "",
  lengthInches: "0",
  extras: "1",
  coveredArea: "",
});

function calcSqFt(d: RoomDraft): number {
  const w = Number(d.widthFeet || 0) + Number(d.widthInches || 0) / 12;
  const l = Number(d.lengthFeet || 0) + Number(d.lengthInches || 0) / 12;
  const count = parseInt(d.extras || "1", 10) || 1;
  return Math.round(w * l * count * 100) / 100;
}

export function AdminUnitFormClient({
  mode,
  unitId,
}: {
  mode: "create" | "edit";
  unitId?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetProjectId = searchParams.get("projectId") ?? "";

  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<UnitRoom[]>([]);

  const [projectId, setProjectId] = useState(presetProjectId);
  const [title, setTitle] = useState("");
  const [roomsLabel, setRoomsLabel] = useState("");
  const [grossArea, setGrossArea] = useState("");
  const [measurementTypeId, setMeasurementTypeId] = useState("1");
  const [unitTypeId, setUnitTypeId] = useState("");
  const [price, setPrice] = useState("");
  const [loanAmount, setLoanAmount] = useState("0");
  const [downPayment, setDownPayment] = useState("");
  const [monthlyInstallment, setMonthlyInstallment] = useState("");
  const [installmentTypeId, setInstallmentTypeId] = useState("1");
  const [installmentLength, setInstallmentLength] = useState("");
  const [description, setDescription] = useState("");

  const [floorPlanUrl, setFloorPlanUrl] = useState<string | null>(null);
  const [paymentPlanUrl, setPaymentPlanUrl] = useState<string | null>(null);
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [paymentPlanFile, setPaymentPlanFile] = useState<File | null>(null);
  const [removeFloorPlan, setRemoveFloorPlan] = useState(false);
  const [removePaymentPlan, setRemovePaymentPlan] = useState(false);

  const [newRoom, setNewRoom] = useState<RoomDraft>(emptyRoomDraft);
  const [showNewRoomForm, setShowNewRoomForm] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editRoom, setEditRoom] = useState<RoomDraft>(emptyRoomDraft);
  const [readingFloorPlan, setReadingFloorPlan] = useState(false);
  const [roomsNotice, setRoomsNotice] = useState("");
  const [roomGroupsEnabled, setRoomGroupsEnabled] = useState(false);
  const [roomGroups, setRoomGroups] = useState<AdminRoomGroup[]>([]);
  const [groupingOn, setGroupingOn] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState("");

  const newRoomArea = useMemo(() => calcSqFt(newRoom), [newRoom]);
  const roomsTotalSqFt = useMemo(
    () => Math.round(rooms.reduce((sum, r) => sum + (Number(r.coveredArea) || 0), 0) * 100) / 100,
    [rooms]
  );
  const editRoomArea = useMemo(() => calcSqFt(editRoom), [editRoom]);

  const applyMetaFromJson = (json: Record<string, unknown>) => {
    setMeta({
      projectTypes: (json.projectTypes as Meta["projectTypes"]) ?? [],
      roomTypes: (json.roomTypes as Meta["roomTypes"]) ?? [],
      projects: (json.projects as Meta["projects"]) ?? [],
      measurements:
        Array.isArray(json.measurements) && json.measurements.length
          ? (json.measurements as Meta["measurements"])
          : [{ id: 1, name: "Sq Ft", convertor: 1 }],
      installmentTypes:
        Array.isArray(json.installmentTypes) && json.installmentTypes.length
          ? (json.installmentTypes as Meta["installmentTypes"])
          : DEFAULT_INSTALLMENT_TYPES,
    });
  };

  /** Rooms plus room groups from a GET /api/admin/units/[id] unit. */
  const applyRoomsFromUnit = (u: Record<string, unknown>) => {
    const groups = (u.roomGroups as AdminRoomGroup[] | undefined) ?? [];
    setRooms((u.unitRooms as UnitRoom[] | undefined) ?? []);
    setRoomGroupsEnabled(Boolean(u.roomGroupsEnabled));
    setRoomGroups(groups);
    // Stays on while switched on, even before the first group is added.
    if (groups.length) setGroupingOn(true);
  };

  const loadUnit = useCallback(async () => {
    try {
      if (mode === "edit" && unitId) {
        const res = await fetch(`/api/admin/units/${unitId}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success || !json.unit) {
          setError(
            json.message ??
              `Unit load failed (HTTP ${res.status}). Run: npx prisma generate && restart dev server.`
          );
          return false;
        }
        applyMetaFromJson(json);
        const u = json.unit;
        setProjectId(String(u.projectId));
        setTitle(u.title ?? "");
        setRoomsLabel(u.rooms ?? "");
        setGrossArea(u.grossArea != null ? String(u.grossArea) : "");
        setMeasurementTypeId(String(u.measurementTypeId ?? 1));
        setUnitTypeId(u.unitTypeId ? String(u.unitTypeId) : "");
        setPrice(String(u.price ?? ""));
        setLoanAmount(String(u.loanAmount ?? 0));
        setDownPayment(String(u.downPayment ?? ""));
        setMonthlyInstallment(String(u.monthlyInstallment ?? ""));
        setInstallmentTypeId(String(u.installmentTypeId ?? 1));
        setInstallmentLength(
          u.installmentLength != null ? String(u.installmentLength) : ""
        );
        setDescription(u.description ?? "");
        setFloorPlanUrl(u.floorPlanUrl);
        setPaymentPlanUrl(u.paymentPlanUrl);
        applyRoomsFromUnit(u);
        return true;
      }

      const metaRes = await fetch("/api/admin/units/meta");
      const metaJson = await metaRes.json().catch(() => ({}));
      if (metaRes.ok && metaJson.success !== false) {
        applyMetaFromJson(metaJson);
      } else {
        setError(metaJson.message ?? `Form options failed (HTTP ${metaRes.status})`);
      }

      if (presetProjectId) setProjectId(presetProjectId);
      return true;
    } catch {
      setError("Could not load unit form. Check database connection and refresh.");
      return false;
    }
  }, [mode, unitId, presetProjectId]);

  useEffect(() => {
    loadUnit().finally(() => setLoading(false));
  }, [loadUnit]);

  async function uploadMedia(id: number) {
    if (!floorPlanFile && !paymentPlanFile && !removeFloorPlan && !removePaymentPlan) return;
    const fd = new FormData();
    if (floorPlanFile) fd.set("floorPlan", floorPlanFile);
    if (paymentPlanFile) fd.set("paymentPlan", paymentPlanFile);
    if (removeFloorPlan) fd.set("removeFloorPlan", "1");
    if (removePaymentPlan) fd.set("removePaymentPlan", "1");
    await fetch(`/api/admin/units/${id}/media`, { method: "POST", body: fd });
  }

  function bodyPayload() {
    return {
      projectId: Number(projectId),
      title,
      rooms: roomsLabel,
      grossArea: grossArea ? Number(grossArea) : null,
      measurementTypeId: Number(measurementTypeId),
      unitTypeId: Number(unitTypeId),
      price: Number(price),
      loanAmount: Number(loanAmount),
      downPayment: Number(downPayment),
      monthlyInstallment: Number(monthlyInstallment),
      installmentTypeId: Number(installmentTypeId),
      installmentLength: installmentLength ? Number(installmentLength) : null,
      description,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!projectId || !title || !unitTypeId) {
      setError("Project, title, and unit type are required");
      setSaving(false);
      return;
    }

    if (mode === "create") {
      const res = await fetch("/api/admin/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload()),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.id) {
        setError(json.message ?? `Create failed (HTTP ${res.status})`);
        setSaving(false);
        return;
      }
      await uploadMedia(json.id);
      router.push(`/admin/units/${json.id}/edit`);
      return;
    }

    const res = await fetch(`/api/admin/units/${unitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload()),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.message ?? "Update failed");
      setSaving(false);
      return;
    }
    await uploadMedia(unitId!);
    setSaving(false);
    router.push(`/admin/projects/${projectId}`);
  }

  async function addRoom() {
    if (!unitId || !newRoom.roomTypeId) {
      alert("Select a room type");
      return;
    }
    const res = await fetch(`/api/admin/units/${unitId}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomTypeId: Number(newRoom.roomTypeId),
        widthFeet: Number(newRoom.widthFeet),
        widthInches: Number(newRoom.widthInches),
        lengthFeet: Number(newRoom.lengthFeet),
        lengthInches: Number(newRoom.lengthInches),
        extras: newRoom.extras,
        coveredArea: newRoomArea,
        groupId: newRoomsGroupId,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.message ?? "Failed to add room");
      return;
    }
    setNewRoom(emptyRoomDraft());
    setShowNewRoomForm(false);
    await loadUnit();
  }

  const updateRoomTypes = useCallback(
    (roomTypes: { id: number; name: string }[]) =>
      setMeta((current) => (current ? { ...current, roomTypes } : current)),
    []
  );

  const measurement =
    meta?.measurements.find((m) => String(m.id) === measurementTypeId) ??
    { id: 1, name: "Sq Ft", convertor: 1 };
  const roomsTotalInUnit = Math.round((roomsTotalSqFt / (measurement.convertor || 1)) * 100) / 100;

  /** Refreshes only the rooms list, so unsaved edits elsewhere in the form are kept. */
  async function reloadRooms() {
    if (!unitId) return;
    const res = await fetch(`/api/admin/units/${unitId}`);
    const json = await res.json().catch(() => ({}));
    if (json.success && json.unit) applyRoomsFromUnit(json.unit);
  }

  // New rooms go to the picked group, or the first one when the pick no longer exists.
  const groupsActive = roomGroupsEnabled && groupingOn && roomGroups.length > 0;
  const newRoomsGroupId = groupsActive
    ? (roomGroups.find((g) => String(g.id) === targetGroupId) ?? roomGroups[0]).id
    : null;
  const roomCountsByGroup = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of rooms) if (r.groupId != null) counts.set(r.groupId, (counts.get(r.groupId) ?? 0) + 1);
    return counts;
  }, [rooms]);

  async function setGrouping(on: boolean) {
    if (on) {
      setGroupingOn(true);
      return;
    }
    if (roomGroups.length) {
      const ok = confirm(
        `Turn off layouts / floors? The ${roomGroups.length} ${roomGroups.length === 1 ? "group is" : "groups are"} deleted; every room stays on the unit.`
      );
      if (!ok) return;
      const res = await fetch(`/api/admin/units/${unitId}/room-groups`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!json.success) {
        alert(json.message ?? "Could not remove the groups");
        return;
      }
    }
    setGroupingOn(false);
    await reloadRooms();
  }

  async function moveRoomToGroup(roomId: number, groupId: string) {
    const res = await fetch(`/api/admin/units/${unitId}/rooms/${roomId}/group`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: groupId ? Number(groupId) : null }),
    });
    const json = await res.json().catch(() => ({}));
    if (!json.success) alert(json.message ?? "Could not move the room");
    await reloadRooms();
  }

  function cancelNewRoom() {
    setNewRoom(emptyRoomDraft());
    setShowNewRoomForm(false);
  }

  async function saveRoomEdit() {
    if (!editingRoomId) return;
    if (!editRoom.roomTypeId) {
      alert("Select a room type");
      return;
    }
    const res = await fetch(`/api/admin/units/${unitId}/rooms/${editingRoomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomTypeId: Number(editRoom.roomTypeId),
        widthFeet: Number(editRoom.widthFeet),
        widthInches: Number(editRoom.widthInches),
        lengthFeet: Number(editRoom.lengthFeet),
        lengthInches: Number(editRoom.lengthInches),
        extras: editRoom.extras,
        coveredArea: editRoomArea,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.message ?? "Failed to update room");
      return;
    }
    setEditingRoomId(null);
    await loadUnit();
  }

  async function deleteRoom(roomId: number) {
    if (!confirm("Remove this room from the unit?")) return;
    const res = await fetch(`/api/admin/units/${unitId}/rooms/${roomId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else await loadUnit();
  }

  function startEditRoom(r: UnitRoom) {
    setEditingRoomId(r.id);
    setEditRoom({
      roomTypeId: String(r.roomTypeId),
      widthFeet: String(r.widthFeet ?? ""),
      widthInches: String(r.widthInches ?? 0),
      lengthFeet: String(r.lengthFeet ?? ""),
      lengthInches: String(r.lengthInches ?? 0),
      extras: r.extras ?? "1",
      coveredArea: r.coveredArea != null ? String(r.coveredArea) : "",
    });
  }

  const renderRoom = (r: UnitRoom) => (
    <li
      key={r.id}
      className="rounded-lg border border-zinc-200 p-3 text-sm"
    >
      {editingRoomId === r.id ? (
        <RoomFields
          draft={editRoom}
          setDraft={setEditRoom}
          roomTypes={meta?.roomTypes ?? []}
          area={editRoomArea}
        />
      ) : (
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <strong>{r.roomTypeName}</strong>
            <span className="ml-2 text-zinc-500">
              {r.widthFeet}′{r.widthInches ?? 0}″ × {r.lengthFeet}′
              {r.lengthInches ?? 0}″ · qty {r.extras ?? 1} ·{" "}
              {r.coveredArea ?? "—"} sq ft
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {groupsActive ? (
              <AdminSelect
                layout="inline"
                aria-label="Room group"
                className="w-44"
                value={r.groupId != null ? String(r.groupId) : ""}
                onChange={(value) => void moveRoomToGroup(r.id, value)}
                options={[
                  ...roomGroups.map((g) => ({ value: String(g.id), label: g.name })),
                  { value: "", label: "No group" },
                ]}
              />
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={() => startEditRoom(r)}>
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-red-600"
              onClick={() => deleteRoom(r.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
      {editingRoomId === r.id && (
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" onClick={saveRoomEdit}>
            Save room
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditingRoomId(null)}>
            Cancel
          </Button>
        </div>
      )}
    </li>
  );

  if (loading) return <LoadingState size="sm" />;

  const metaEmpty =
    meta &&
    !meta.projectTypes.length &&
    !meta.roomTypes.length &&
    !meta.projects.length;

  return (
    <div className="space-y-4">
      <AdminBackLink href="/admin/units">Units</AdminBackLink>
      {error &&
        (error.toLowerCase().includes("database disabled") ? (
          <AdminDbAlert message={error} />
        ) : (
          <AdminErrorAlert message={error} backHref="/admin/units" backLabel="Units" />
        ))}
      {metaEmpty && (
        <AdminDbAlert message="Dropdown lists are empty. Check database connection and run npx prisma generate, then restart npm run dev." />
      )}

      <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className="space-y-4">
        <div className={`${adminCard} space-y-4 p-6`}>
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "Create unit" : "Edit unit"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Project *</span>
              <AdminSelect
                layout="field"
                required
                value={projectId}
                onChange={setProjectId}
                disabled={mode === "edit"}
                placeholder="Select project"
                options={(meta?.projects ?? []).map((p) => ({
                  value: String(p.id),
                  label: p.name,
                }))}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Title *</span>
              <Input layout="field"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Rooms label</span>
              <Input layout="field"
                value={roomsLabel}
                onChange={(e) => setRoomsLabel(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Unit type *</span>
              <AdminSelect
                layout="field"
                required
                value={unitTypeId}
                onChange={setUnitTypeId}
                placeholder="Select type"
                options={(meta?.projectTypes ?? []).map((t) => ({
                  value: String(t.id),
                  label: t.title,
                }))}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Gross area</span>
              <Input layout="field"
                type="number"
                min={0}
                step="any"
                value={grossArea}
                onChange={(e) => setGrossArea(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Measurement unit</span>
              <AdminSelect
                layout="field"
                value={measurementTypeId}
                onChange={setMeasurementTypeId}
                options={(meta?.measurements.length
                  ? meta.measurements
                  : [{ id: 1, name: "Sq Ft", convertor: 1 }]
                ).map((m) => ({
                  value: String(m.id),
                  label: m.name,
                }))}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Price *</span>
              <Input layout="field"
                type="number"
                min={0}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Loan amount</span>
              <Input layout="field"
                type="number"
                min={0}
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Down payment *</span>
              <Input layout="field"
                type="number"
                min={0}
                required
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Monthly installment *</span>
              <Input layout="field"
                type="number"
                min={0}
                required
                value={monthlyInstallment}
                onChange={(e) => setMonthlyInstallment(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">Installment type</span>
                <AdminSelect
                  layout="field"
                  value={installmentTypeId}
                  onChange={setInstallmentTypeId}
                  options={(meta?.installmentTypes.length
                    ? meta.installmentTypes
                    : DEFAULT_INSTALLMENT_TYPES
                  ).map((t) => ({
                    value: String(t.id),
                    label: t.name,
                  }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">Installment length</span>
                <Input layout="field"
                  type="number"
                  min={0}
                  value={installmentLength}
                  onChange={(e) => setInstallmentLength(e.target.value)}
                />
              </label>
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Description</span>
            <Textarea layout="field"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>

        <AdminFormSection title="Floor plan & payment plan images">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">Floor plan</p>
              {floorPlanUrl && !removeFloorPlan && (
                <img
                  src={floorPlanUrl}
                  alt="Floor plan"
                  className="mb-2 max-h-40 rounded border object-contain"
                />
              )}
              <Input layout="field"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setFloorPlanFile(e.target.files?.[0] ?? null);
                  setRemoveFloorPlan(false);
                }}
              />
              {floorPlanUrl && !removeFloorPlan && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setRemoveFloorPlan(true)}
                >
                  Remove floor plan
                </Button>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">Payment plan</p>
              {paymentPlanUrl && !removePaymentPlan && (
                <img
                  src={paymentPlanUrl}
                  alt="Payment plan"
                  className="mb-2 max-h-40 rounded border object-contain"
                />
              )}
              <Input layout="field"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setPaymentPlanFile(e.target.files?.[0] ?? null);
                  setRemovePaymentPlan(false);
                }}
              />
              {paymentPlanUrl && !removePaymentPlan && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setRemovePaymentPlan(true)}
                >
                  Remove payment plan
                </Button>
              )}
            </div>
          </div>
        </AdminFormSection>

        {mode === "create" && (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
            Save the unit first, then edit it to add unit rooms (create, edit, archive per room).
          </p>
        )}

        {mode === "edit" && unitId && (
          <AdminFormSection
            title="Unit rooms"
            actions={
              roomGroupsEnabled ? (
                <RoomGroupsSwitch checked={groupingOn} onChange={(on) => void setGrouping(on)} />
              ) : null
            }
          >
            {roomGroupsEnabled && groupingOn ? (
              <AdminRoomGroupsManager
                unitId={unitId}
                groups={roomGroups}
                roomCounts={roomCountsByGroup}
                onChanged={async (created) => {
                  if (created) setTargetGroupId(String(created.id));
                  await reloadRooms();
                }}
              />
            ) : null}

            {rooms.length === 0 ? (
              <p className="text-sm text-zinc-500">No rooms yet.</p>
            ) : groupsActive ? (
              <div className="space-y-5">
                {[
                  ...roomGroups.map((g) => ({
                    key: String(g.id),
                    name: g.name,
                    rooms: rooms.filter((r) => r.groupId === g.id),
                  })),
                  {
                    key: "none",
                    name: "Not in a group",
                    rooms: rooms.filter((r) => r.groupId == null || !roomGroups.some((g) => g.id === r.groupId)),
                  },
                ]
                  .filter((section) => section.key !== "none" || section.rooms.length)
                  .map((section) => (
                    <div key={section.key}>
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800">
                        <span aria-hidden className="h-4 w-1 rounded-full bg-brand-accent" />
                        {section.name}
                        <span className="text-xs font-normal text-zinc-500">
                          {section.rooms.length} {section.rooms.length === 1 ? "room" : "rooms"}
                        </span>
                      </p>
                      {section.rooms.length ? (
                        <ul className="space-y-3">{section.rooms.map(renderRoom)}</ul>
                      ) : (
                        <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-xs text-zinc-500">
                          No rooms yet. Add rooms to this group below, or move rooms here with their group menu.
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <ul className="space-y-3">{rooms.map(renderRoom)}</ul>
            )}

            {roomsTotalSqFt > 0 ? (
              <div className="mt-3 rounded-xl bg-clay-well px-4 py-3 shadow-clay-inset">
                <p className="text-sm text-zinc-700">
                  Total area of rooms:{" "}
                  <strong className="text-zinc-900">
                    {roomsTotalSqFt.toLocaleString("en-PK")} sq ft
                  </strong>
                  {measurement.convertor !== 1 ? (
                    <span className="text-zinc-500">
                      {" "}
                      (= {roomsTotalInUnit.toLocaleString("en-PK")} {measurement.name})
                    </span>
                  ) : null}
                </p>
              </div>
            ) : null}

            {roomsNotice ? <p className="mt-3 text-sm text-emerald-700">{roomsNotice}</p> : null}

            <div className="mt-4">
              {groupsActive ? (
                <label className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-zinc-700">Add new rooms to</span>
                  <AdminSelect
                    layout="inline"
                    aria-label="Group for new rooms"
                    className="w-52"
                    value={String(newRoomsGroupId)}
                    onChange={setTargetGroupId}
                    options={roomGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                  />
                </label>
              ) : null}
              {!showNewRoomForm ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowNewRoomForm(true)}>
                    Add room
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    disabled={!(floorPlanFile || (floorPlanUrl && !removeFloorPlan))}
                    onClick={() => {
                      setRoomsNotice("");
                      setReadingFloorPlan(true);
                    }}
                  >
                    <ScanText className="h-4 w-4" />
                    Read rooms from floor plan
                  </Button>
                  {!(floorPlanFile || (floorPlanUrl && !removeFloorPlan)) ? (
                    <span className="text-xs text-zinc-500">Add a floor plan image above first.</span>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-300 p-4">
                  <p className="mb-2 text-sm font-medium text-zinc-800">Add room</p>
                  <RoomFields
                    draft={newRoom}
                    setDraft={setNewRoom}
                    roomTypes={meta?.roomTypes ?? []}
                    area={newRoomArea}
                  />
                  <div className="mt-3 flex gap-2">
                    <Button type="button" onClick={addRoom}>
                      Save room
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelNewRoom}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {readingFloorPlan ? (
              <AdminFloorPlanRoomsDialog
                unitId={unitId}
                floorPlanFile={floorPlanFile}
                floorPlanUrl={removeFloorPlan ? null : floorPlanUrl}
                roomTypes={meta?.roomTypes ?? []}
                groupId={newRoomsGroupId}
                onClose={() => setReadingFloorPlan(false)}
                onRoomTypesChange={updateRoomTypes}
                onAdded={(count) => {
                  setReadingFloorPlan(false);
                  setRoomsNotice(`${count} ${count === 1 ? "room" : "rooms"} added from the floor plan.`);
                  void reloadRooms();
                }}
              />
            ) : null}
          </AdminFormSection>
        )}

        <div className="flex justify-between gap-2">
          <Button asChild variant="outline">
            <Link href={mode === "create" ? "/admin/units" : `/admin/projects/${projectId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create unit" : "Save unit"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RoomFields({
  draft,
  setDraft,
  roomTypes,
  area,
}: {
  draft: RoomDraft;
  setDraft: (d: RoomDraft) => void;
  roomTypes: { id: number; name: string }[];
  area: number;
}) {
  const set = (key: keyof RoomDraft, val: string) =>
    setDraft({ ...draft, [key]: val });

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <label className="block text-sm sm:col-span-2 lg:col-span-3">
        <span className="text-zinc-600">Room type *</span>
        <AdminSelect
          layout="field"
          value={draft.roomTypeId}
          onChange={(val) => set("roomTypeId", val)}
          placeholder="Select room type"
          options={roomTypes.map((rt) => ({
            value: String(rt.id),
            label: rt.name,
          }))}
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600">Width (ft)</span>
        <Input layout="field"
          type="number"
          min={0}
          value={draft.widthFeet}
          onChange={(e) => set("widthFeet", e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600">Width (in)</span>
        <Input layout="field"
          type="number"
          min={0}
          max={11}
          value={draft.widthInches}
          onChange={(e) => set("widthInches", e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600">Length (ft)</span>
        <Input layout="field"
          type="number"
          min={0}
          value={draft.lengthFeet}
          onChange={(e) => set("lengthFeet", e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600">Length (in)</span>
        <Input layout="field"
          type="number"
          min={0}
          max={11}
          value={draft.lengthInches}
          onChange={(e) => set("lengthInches", e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600">Count (extras)</span>
        <Input layout="field"
          type="number"
          min={1}
          value={draft.extras}
          onChange={(e) => set("extras", e.target.value)}
        />
      </label>
      <p className="text-sm text-zinc-500 sm:col-span-2 lg:col-span-3">
        Calculated area: <strong>{area}</strong> sq ft
      </p>
    </div>
  );
}
