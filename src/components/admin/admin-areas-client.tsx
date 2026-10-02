"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminSelect } from "@/components/admin/admin-select";
import { AdminErrorAlert, adminCard, adminTableHead } from "@/components/admin/admin-ui";

type AreaRow = { id: number; name: string; cityId: number | null; cityName: string | null };
type CityRow = { id: number; name: string; slug: string };

export function AdminAreasClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);

  const [newCityName, setNewCityName] = useState("");
  const [addingCity, setAddingCity] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [editingCityId, setEditingCityId] = useState<number | null>(null);
  const [editingCityName, setEditingCityName] = useState("");

  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaCityId, setNewAreaCityId] = useState("");
  const [addingArea, setAddingArea] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/admin/areas")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setError(json.message ?? "Failed to load");
          return;
        }
        setAreas(json.areas ?? []);
        setCities(json.cities ?? []);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const cityOptions = cities.map((c) => ({ value: String(c.id), label: c.name }));

  async function addCity() {
    if (!newCityName.trim()) return;
    setAddingCity(true);
    setCityError(null);
    const res = await fetch("/api/admin/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCityName.trim() }),
    });
    const json = await res.json();
    setAddingCity(false);
    if (!json.success) {
      setCityError(json.message ?? "Failed to add city");
      return;
    }
    setNewCityName("");
    load();
  }

  async function saveCityRename(id: number) {
    if (!editingCityName.trim()) return;
    setCityError(null);
    const res = await fetch(`/api/admin/cities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingCityName.trim() }),
    });
    const json = await res.json();
    if (!json.success) {
      setCityError(json.message ?? "Failed to rename city");
      return;
    }
    setEditingCityId(null);
    load();
  }

  async function addArea() {
    if (!newAreaName.trim() || !newAreaCityId) return;
    setAddingArea(true);
    setAreaError(null);
    const res = await fetch("/api/admin/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newAreaName.trim(), cityId: Number(newAreaCityId) }),
    });
    const json = await res.json();
    setAddingArea(false);
    if (!json.success) {
      setAreaError(json.message ?? "Failed to add area");
      return;
    }
    setNewAreaName("");
    setNewAreaCityId("");
    load();
  }

  async function reassignAreaCity(areaId: number, cityId: string) {
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId
          ? { ...a, cityId: Number(cityId), cityName: cities.find((c) => String(c.id) === cityId)?.name ?? a.cityName }
          : a
      )
    );
    const res = await fetch(`/api/admin/areas/${areaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId: Number(cityId) }),
    });
    const json = await res.json();
    if (!json.success) {
      setAreaError(json.message ?? "Failed to update area's city");
      load();
    }
  }

  if (loading) return <LoadingState size="sm" />;
  if (error) return <AdminErrorAlert message={error} />;

  return (
    <div className="space-y-6">
      <div className={`${adminCard} p-5`}>
        <h2 className="text-sm font-semibold text-zinc-800">Cities</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Areas belong to a city — used by the &ldquo;City&rdquo; filter on the public projects page.
        </p>

        <div className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {cities.map((city) => (
            <div key={city.id} className="flex items-center justify-between gap-3 px-3 py-2">
              {editingCityId === city.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    layout="field"
                    value={editingCityName}
                    onChange={(e) => setEditingCityName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), saveCityRename(city.id))}
                    autoFocus
                  />
                  <Button type="button" size="sm" onClick={() => saveCityRename(city.id)}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingCityId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-zinc-800">{city.name}</span>
                  <button
                    type="button"
                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    onClick={() => {
                      setEditingCityId(city.id);
                      setEditingCityName(city.name);
                    }}
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
          {cities.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-zinc-400">No cities yet</p>
          )}
        </div>

        {cityError && <p className="mt-2 text-sm text-red-600">{cityError}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            layout="field"
            placeholder="New city name…"
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCity())}
            className="max-w-xs"
          />
          <Button type="button" disabled={addingCity || !newCityName.trim()} onClick={addCity} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add city
          </Button>
        </div>
      </div>

      <div className={`${adminCard} p-5`}>
        <h2 className="text-sm font-semibold text-zinc-800">Areas ({areas.length})</h2>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Input
            layout="field"
            placeholder="New area name…"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            className="max-w-xs"
          />
          <AdminSelect
            layout="field"
            value={newAreaCityId}
            onChange={setNewAreaCityId}
            placeholder="Select city"
            options={cityOptions}
            className="max-w-[180px]"
          />
          <Button
            type="button"
            disabled={addingArea || !newAreaName.trim() || !newAreaCityId}
            onClick={addArea}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add area
          </Button>
        </div>

        {areaError && <p className="mt-2 text-sm text-red-600">{areaError}</p>}

        <div className="-mx-5 mt-4 overflow-x-auto border-y border-zinc-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>Area</th>
                <th className={adminTableHead}>City</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                  <td className="px-5 py-2.5 text-zinc-800">{area.name}</td>
                  <td className="px-4 py-2.5">
                    <AdminSelect
                      value={area.cityId != null ? String(area.cityId) : ""}
                      onChange={(v) => reassignAreaCity(area.id, v)}
                      placeholder="Unassigned"
                      options={cityOptions}
                      className="max-w-[180px]"
                    />
                  </td>
                </tr>
              ))}
              {areas.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-6 text-center text-zinc-400">
                    No areas yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
