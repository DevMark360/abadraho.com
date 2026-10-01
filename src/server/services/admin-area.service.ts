import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { jsonNum, jsonNumOrNull } from "@/lib/prisma-json";

export type AdminAreaRow = {
  id: number;
  name: string;
  cityId: number | null;
  cityName: string | null;
};

export type AdminCityRow = {
  id: number;
  name: string;
  slug: string;
};

export async function listAdminAreasAndCities(): Promise<{
  areas: AdminAreaRow[];
  cities: AdminCityRow[];
}> {
  if (!isDatabaseEnabled()) return { areas: [], cities: [] };

  const [areas, cities] = await Promise.all([
    prisma.area.findMany({
      orderBy: { name: "asc" },
      include: { city: { select: { id: true, name: true } } },
    }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    areas: areas.map((a) => ({
      id: jsonNum(a.id),
      name: a.name,
      cityId: jsonNumOrNull(a.cityId),
      cityName: a.city?.name ?? null,
    })),
    cities: cities.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  };
}

export async function createAdminCity(
  name: string
): Promise<{ city: AdminCityRow | null; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { city: null, error: "City name is required" };
  const slug = slugify(trimmed);
  if (!slug) return { city: null, error: "City name is required" };

  const existing = await prisma.city.findUnique({ where: { slug } });
  if (existing) return { city: null, error: "A city with this name already exists" };

  const created = await prisma.city.create({ data: { name: trimmed, slug } });
  return { city: { id: created.id, name: created.name, slug: created.slug } };
}

export async function renameAdminCity(
  id: number,
  name: string
): Promise<{ city: AdminCityRow | null; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { city: null, error: "City name is required" };
  const slug = slugify(trimmed);
  if (!slug) return { city: null, error: "City name is required" };

  const duplicate = await prisma.city.findFirst({ where: { slug, id: { not: id } } });
  if (duplicate) return { city: null, error: "A city with this name already exists" };

  try {
    const updated = await prisma.city.update({ where: { id }, data: { name: trimmed, slug } });
    return { city: { id: updated.id, name: updated.name, slug: updated.slug } };
  } catch {
    return { city: null, error: "City not found" };
  }
}

export async function createAdminArea(
  name: string,
  cityId: number
): Promise<{ area: AdminAreaRow | null; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { area: null, error: "Area name is required" };
  if (!Number.isFinite(cityId)) return { area: null, error: "City is required" };

  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) return { area: null, error: "City not found" };

  const existing = await prisma.area.findFirst({ where: { name: trimmed } });
  if (existing) return { area: null, error: "An area with this name already exists" };

  const created = await prisma.area.create({ data: { name: trimmed, cityId } });
  return {
    area: { id: jsonNum(created.id), name: created.name, cityId, cityName: city.name },
  };
}

export async function setAreaCity(
  areaId: number,
  cityId: number
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(cityId)) return { success: false, error: "City is required" };
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) return { success: false, error: "City not found" };

  try {
    await prisma.area.update({ where: { id: areaId }, data: { cityId } });
    return { success: true };
  } catch {
    return { success: false, error: "Area not found" };
  }
}
