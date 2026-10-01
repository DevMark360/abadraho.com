import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { tableExists } from "@/lib/db-table-exists";
import type { AdminResourceDef } from "@/config/admin-resources";
import { getResourceById } from "@/config/admin-resources";

type Row = Record<string, unknown>;

function formatUserName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null | undefined): string {
  if (!user) return "—";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "—";
}

function serializeRow(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else if (typeof v === "bigint") out[k] = v.toString();
    else if (typeof v === "object" && v !== null && "toNumber" in (v as object)) {
      out[k] = Number(v);
    } else out[k] = v;
  }
  return out;
}

function parseBody(body: Record<string, unknown>, fields: AdminResourceDef["fields"]) {
  const data: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = body[f.name];
    if (raw === undefined || raw === "") continue;
    if (f.type === "number") data[f.name] = Number(raw);
    else if (f.type === "checkbox") data[f.name] = raw === true || raw === "true";
    else data[f.name] = String(raw);
  }
  return data;
}

function mapProjectWriteData(data: Record<string, unknown>) {
  return {
    ...(data.name != null ? { name: String(data.name) } : {}),
    ...(data.slug != null ? { slug: String(data.slug) } : {}),
    ...(data.address != null ? { address: String(data.address) } : {}),
    ...(data.details != null ? { details: String(data.details) } : {}),
    ...(data.status != null ? { status: Number(data.status) } : {}),
    ...(data.areaId != null ? { areaId: BigInt(String(data.areaId)) } : {}),
    ...(data.projectTypeId != null ? { projectTypeId: Number(data.projectTypeId) } : {}),
    ...(data.progressStatusId != null
      ? { progressStatusId: Number(data.progressStatusId) }
      : {}),
    ...(data.latitude != null ? { latitude: Number(data.latitude) } : {}),
    ...(data.longitude != null ? { longitude: Number(data.longitude) } : {}),
    ...(data.minPrice != null ? { minPrice: Number(data.minPrice) } : {}),
    ...(data.discountPrice != null ? { discountPrice: Number(data.discountPrice) } : {}),
    ...(data.installmentLength != null
      ? { installmentLength: Number(data.installmentLength) }
      : {}),
    ...(data.metaTitle != null ? { metaTitle: String(data.metaTitle) } : {}),
    ...(data.metaDescription != null
      ? { metaDescription: String(data.metaDescription) }
      : {}),
  };
}

function mapAdFloorPriceWriteData(data: Record<string, unknown>) {
  return {
    ...(data.areaId != null && data.areaId !== ""
      ? { areaId: BigInt(String(data.areaId)) }
      : {}),
    ...(data.projectTypeId != null && data.projectTypeId !== ""
      ? { projectTypeId: Number(data.projectTypeId) }
      : {}),
    ...(data.placementType != null ? { placementType: String(data.placementType) } : {}),
    ...(data.floorCpm != null ? { floorCpm: Number(data.floorCpm) } : {}),
  };
}

export async function adminList(
  resourceId: string,
  page = 1,
  perPage = 25,
  search = ""
): Promise<{ items: Row[]; total: number; error?: string }> {
  if (!isDatabaseEnabled()) {
    return { items: [], total: 0, error: "Database disabled. Set USE_DATABASE=true in .env" };
  }
  const def = getResourceById(resourceId);
  if (!def) return { items: [], total: 0, error: "Unknown resource" };

  const where = { ...(def.listWhere ?? {}), ...(def.model === "project" && !def.listWhere ? { isArchive: false } : {}) };
  const skip = (page - 1) * perPage;

  try {
    switch (def.model) {
      case "project": {
        const projectWhere = {
          ...where,
          ...(search
            ? {
                OR: [
                  { name: { contains: search } },
                  { slug: { contains: search } },
                  { address: { contains: search } },
                ],
              }
            : {}),
        };
        const [items, total] = await Promise.all([
          prisma.project.findMany({
            where: projectWhere,
            orderBy: { id: "desc" },
            skip,
            take: perPage,
            include: { location: true, projectType: true },
          }),
          prisma.project.count({ where: projectWhere }),
        ]);
        return {
          items: items.map((r) =>
            serializeRow({
              ...(r as Row),
              areaName: r.location?.name ?? "",
              projectTypeTitle: r.projectType?.title ?? "",
            })
          ),
          total,
        };
      }
      case "unit": {
        const [items, total] = await Promise.all([
          prisma.unit.findMany({ where: { isArchive: false }, orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.unit.count({ where: { isArchive: false } }),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "area": {
        const [items, total] = await Promise.all([
          prisma.area.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.area.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "projectType": {
        const [items, total] = await Promise.all([
          prisma.projectType.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.projectType.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "progress": {
        const [items, total] = await Promise.all([
          prisma.progress.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.progress.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "builder": {
        const builderWhere = search
          ? {
              OR: [
                { fullName: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {};
        const [items, total] = await Promise.all([
          prisma.builder.findMany({ where: builderWhere, orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.builder.count({ where: builderWhere }),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "user": {
        const [items, total] = await Promise.all([
          prisma.user.findMany({ where, orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.user.count({ where }),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "broker": {
        const [items, total] = await Promise.all([
          prisma.broker.findMany({ where: { isArchive: false }, orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.broker.count({ where: { isArchive: false } }),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "inquiry": {
        const [items, total] = await Promise.all([
          prisma.inquiry.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.inquiry.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "blog": {
        const [items, total] = await Promise.all([
          prisma.blog.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.blog.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "blogCategory": {
        const [items, total] = await Promise.all([
          prisma.blogCategory.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.blogCategory.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "review": {
        const [items, total] = await Promise.all([
          prisma.review.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.review.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "contactUs": {
        const [items, total] = await Promise.all([
          prisma.contactUs.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.contactUs.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "adWalletTransaction": {
        const [items, total] = await Promise.all([
          prisma.adWalletTransaction.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.adWalletTransaction.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "adCampaign": {
        const [items, total] = await Promise.all([
          prisma.adCampaign.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.adCampaign.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "adFloorPrice": {
        const [items, total] = await Promise.all([
          prisma.adFloorPrice.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.adFloorPrice.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "userSearchHistory": {
        const historyWhere = (def.listWhere ?? {}) as Record<string, unknown>;
        const [items, total] = await Promise.all([
          prisma.userSearchHistory.findMany({
            where: historyWhere,
            orderBy: { id: "desc" },
            skip,
            take: perPage,
          }),
          prisma.userSearchHistory.count({ where: historyWhere }),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "wishlist": {
        const [items, total] = await Promise.all([
          prisma.wishlist.findMany({ orderBy: { id: "desc" }, skip, take: perPage, include: { user: true, project: true } }),
          prisma.wishlist.count(),
        ]);
        return {
          items: items.map((w) =>
            serializeRow({
              id: w.id,
              userName: formatUserName(w.user),
              projectName: w.project.name,
              createdAt: w.createdAt,
            } as Row)
          ),
          total,
        };
      }
      case "amenity": {
        const [items, total] = await Promise.all([
          prisma.amenity.findMany({ where: { isArchive: false }, orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.amenity.count({ where: { isArchive: false } }),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "utility": {
        const [items, total] = await Promise.all([
          prisma.utility.findMany({ where: { isArchive: false }, orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.utility.count({ where: { isArchive: false } }),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "tag": {
        const [items, total] = await Promise.all([
          prisma.tag.findMany({ where: { isArchive: false }, orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.tag.count({ where: { isArchive: false } }),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "roomType": {
        const [items, total] = await Promise.all([
          prisma.roomType.findMany({ where: { isArchive: false }, orderBy: { sortOrder: "asc" }, skip, take: perPage }),
          prisma.roomType.count({ where: { isArchive: false } }),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "voucher": {
        const [items, total] = await Promise.all([
          prisma.voucher.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.voucher.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "team": {
        const [items, total] = await Promise.all([
          prisma.team.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.team.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "paymentSchedule": {
        const [items, total] = await Promise.all([
          prisma.paymentSchedule.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.paymentSchedule.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "video": {
        if (!(await tableExists("videos"))) return { items: [], total: 0 };
        const [rows, countRows] = await Promise.all([
          queryRaw<Row[]>(
            `SELECT id, title, url, description, project_id AS projectId
             FROM videos ORDER BY id DESC LIMIT ? OFFSET ?`,
            perPage,
            skip
          ),
          queryRaw<{ cnt: bigint }[]>(`SELECT COUNT(*) AS cnt FROM videos`),
        ]);
        return {
          items: rows.map((r) => serializeRow(r)),
          total: Number(countRows[0]?.cnt ?? 0),
        };
      }
      case "activityLog": {
        const [items, total] = await Promise.all([
          prisma.activityLog.findMany({
            orderBy: { id: "desc" },
            skip,
            take: perPage,
            include: { causer: true },
          }),
          prisma.activityLog.count(),
        ]);
        return {
          items: items.map((r) =>
            serializeRow({
              id: r.id,
              logName: r.logName,
              conversionId: r.conversionId,
              userName: formatUserName(r.causer),
              pageUrl: r.pageUrl,
              ip: r.ip,
              createdAt: r.createdAt,
            } as Row)
          ),
          total,
        };
      }
      case "customer": {
        const where = { userTypeId: -10024, isArchive: false };
        const [items, total] = await Promise.all([
          prisma.user.findMany({ where, orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.user.count({ where }),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      case "userVoucher": {
        const [items, total] = await Promise.all([
          prisma.userVoucher.findMany({ orderBy: { id: "desc" }, skip, take: perPage }),
          prisma.userVoucher.count(),
        ]);
        return { items: items.map((r) => serializeRow(r as Row)), total };
      }
      default:
        return { items: [], total: 0, error: "Model not implemented" };
    }
  } catch (e) {
    return { items: [], total: 0, error: String(e) };
  }
}

export async function adminGet(
  resourceId: string,
  id: number
): Promise<{ item: Row | null; error?: string }> {
  if (!isDatabaseEnabled()) return { item: null, error: "Database disabled" };
  const def = getResourceById(resourceId);
  if (!def) return { item: null, error: "Unknown resource" };

  try {
    let item: Row | null = null;
    switch (def.model) {
      case "project":
        item = (await prisma.project.findUnique({ where: { id } })) as Row | null;
        break;
      case "unit":
        item = (await prisma.unit.findUnique({ where: { id } })) as Row | null;
        break;
      case "area":
        item = (await prisma.area.findUnique({ where: { id } })) as Row | null;
        break;
      case "projectType":
        item = (await prisma.projectType.findUnique({ where: { id } })) as Row | null;
        break;
      case "progress":
        item = (await prisma.progress.findUnique({ where: { id } })) as Row | null;
        break;
      case "builder":
        item = (await prisma.builder.findUnique({ where: { id } })) as Row | null;
        break;
      case "user":
        item = (await prisma.user.findUnique({ where: { id } })) as Row | null;
        break;
      case "broker":
        item = (await prisma.broker.findUnique({ where: { id } })) as Row | null;
        break;
      case "inquiry":
        item = (await prisma.inquiry.findUnique({ where: { id } })) as Row | null;
        break;
      case "blog":
        item = (await prisma.blog.findUnique({ where: { id } })) as Row | null;
        break;
      case "blogCategory":
        item = (await prisma.blogCategory.findUnique({ where: { id } })) as Row | null;
        break;
      case "review":
        item = (await prisma.review.findUnique({ where: { id } })) as Row | null;
        break;
      case "adWalletTransaction":
        item = (await prisma.adWalletTransaction.findUnique({ where: { id } })) as Row | null;
        break;
      case "adCampaign":
        item = (await prisma.adCampaign.findUnique({ where: { id } })) as Row | null;
        break;
      case "adFloorPrice":
        item = (await prisma.adFloorPrice.findUnique({ where: { id } })) as Row | null;
        break;
      case "contactUs":
        item = (await prisma.contactUs.findUnique({ where: { id } })) as Row | null;
        break;
      case "amenity":
        item = (await prisma.amenity.findUnique({ where: { id } })) as Row | null;
        break;
      case "utility":
        item = (await prisma.utility.findUnique({ where: { id } })) as Row | null;
        break;
      case "tag":
        item = (await prisma.tag.findUnique({ where: { id } })) as Row | null;
        break;
      case "roomType":
        item = (await prisma.roomType.findUnique({ where: { id } })) as Row | null;
        break;
      case "voucher":
        item = (await prisma.voucher.findUnique({ where: { id } })) as Row | null;
        break;
      case "team":
        item = (await prisma.team.findUnique({ where: { id } })) as Row | null;
        break;
      case "paymentSchedule":
        item = (await prisma.paymentSchedule.findUnique({ where: { id } })) as Row | null;
        break;
      case "video": {
        if (await tableExists("videos")) {
          const rows = await queryRaw<Row[]>(
            `SELECT id, title, url, description, project_id AS projectId FROM videos WHERE id = ? LIMIT 1`,
            id
          );
          item = rows[0] ?? null;
        }
        break;
      }
      case "activityLog":
        item = (await prisma.activityLog.findUnique({ where: { id: BigInt(id) } })) as Row | null;
        break;
      case "customer":
        item = (await prisma.user.findUnique({ where: { id } })) as Row | null;
        break;
      case "userVoucher":
        item = (await prisma.userVoucher.findUnique({ where: { id } })) as Row | null;
        break;
      default:
        return { item: null, error: "Not found" };
    }
    return { item: item ? serializeRow(item) : null };
  } catch (e) {
    return { item: null, error: String(e) };
  }
}

export async function adminCreate(
  resourceId: string,
  body: Record<string, unknown>
): Promise<{ item: Row | null; error?: string }> {
  if (!isDatabaseEnabled()) return { item: null, error: "Database disabled" };
  const def = getResourceById(resourceId);
  if (!def?.canCreate) return { item: null, error: "Create not allowed" };
  const data = parseBody(body, def.fields);

  try {
    switch (def.model) {
      case "project": {
        const item = await prisma.project.create({
          data: {
            name: String(data.name ?? ""),
            slug: String(data.slug ?? ""),
            status: Number(data.status ?? 1),
            ...mapProjectWriteData(data),
          },
        });
        return { item: serializeRow(item as Row) };
      }
      case "unit": {
        const item = await prisma.unit.create({
          data: {
            projectId: Number(data.projectId),
            title: data.title as string | undefined,
            price: Number(data.price ?? 0),
            size: data.size != null ? Number(data.size) : undefined,
            rooms: data.rooms as string | undefined,
          },
        });
        return { item: serializeRow(item as Row) };
      }
      case "area": {
        const item = await prisma.area.create({
          data: { name: String(data.name) },
        });
        return { item: serializeRow(item as Row) };
      }
      case "projectType": {
        const item = await prisma.projectType.create({
          data: { title: String(data.title ?? data.name ?? "") },
        });
        return { item: serializeRow(item as Row) };
      }
      case "progress": {
        const item = await prisma.progress.create({ data: { name: String(data.name) } });
        return { item: serializeRow(item as Row) };
      }
      case "adFloorPrice": {
        const item = await prisma.adFloorPrice.create({
          data: {
            placementType: String(data.placementType ?? ""),
            floorCpm: Number(data.floorCpm ?? 0),
            ...mapAdFloorPriceWriteData(data),
          },
        });
        return { item: serializeRow(item as Row) };
      }
      case "builder": {
        const item = await prisma.builder.create({
          data: {
            fullName: String(data.fullName),
            email: data.email as string | undefined,
            phoneNumber: (data.phoneNumber ?? data.phone) as string | undefined,
          },
        });
        return { item: serializeRow(item as Row) };
      }
      case "blog": {
        const item = await prisma.blog.create({
          data: {
            title: String(data.title),
            slug: data.slug ? String(data.slug) : undefined,
            description: (data.description ?? data.content) as string | undefined,
            coverImg: data.coverImg as string | undefined,
            categoryId: data.categoryId != null ? Number(data.categoryId) : undefined,
            metaTitle: String(data.metaTitle ?? ""),
            metaDescription: String(data.metaDescription ?? ""),
            metaKeywords: String(data.metaKeywords ?? ""),
            isActive: 1,
          },
        });
        return { item: serializeRow(item as Row) };
      }
      case "blogCategory": {
        const item = await prisma.blogCategory.create({
          data: { title: String(data.title ?? data.name) },
        });
        return { item: serializeRow(item as Row) };
      }
      case "amenity": {
        const item = await prisma.amenity.create({
          data: { name: String(data.name ?? "") },
        });
        return { item: serializeRow(item as Row) };
      }
      case "utility": {
        const item = await prisma.utility.create({
          data: { name: String(data.name ?? "") },
        });
        return { item: serializeRow(item as Row) };
      }
      case "tag": {
        const item = await prisma.tag.create({
          data: { name: String(data.name ?? "") },
        });
        return { item: serializeRow(item as Row) };
      }
      case "roomType": {
        const item = await prisma.roomType.create({
          data: {
            name: String(data.name ?? ""),
            icon: data.icon as string | undefined,
            toShow: data.toShow != null ? Number(data.toShow) : undefined,
            sortOrder: data.sortOrder != null ? Number(data.sortOrder) : undefined,
          },
        });
        return { item: serializeRow(item as Row) };
      }
      case "voucher": {
        return { item: null, error: "Use /admin/vouchers to create vouchers" };
      }
      case "team": {
        const item = await prisma.team.create({
          data: {
            name: String(data.name ?? ""),
            slug: String(data.slug ?? ""),
            teamLeadId: data.teamLeadId != null ? Number(data.teamLeadId) : undefined,
            description: data.description as string | undefined,
          },
        });
        return { item: serializeRow(item as Row) };
      }
      case "video": {
        if (!(await tableExists("videos"))) {
          return { item: null, error: "Videos table not available on this database" };
        }
        await executeRaw(
          `INSERT INTO videos (title, url, project_id, description) VALUES (?, ?, ?, ?)`,
          String(data.title ?? ""),
          String(data.url ?? ""),
          Number(data.projectId),
          (data.description as string) ?? null
        );
        const rows = await queryRaw<Row[]>(
          `SELECT id, title, url, description, project_id AS projectId FROM videos ORDER BY id DESC LIMIT 1`
        );
        return { item: serializeRow(rows[0] ?? {}) };
      }
      default:
        return { item: null, error: "Create not implemented" };
    }
  } catch (e) {
    return { item: null, error: String(e) };
  }
}

export async function adminUpdate(
  resourceId: string,
  id: number,
  body: Record<string, unknown>
): Promise<{ item: Row | null; error?: string }> {
  if (!isDatabaseEnabled()) return { item: null, error: "Database disabled" };
  const def = getResourceById(resourceId);
  if (!def) return { item: null, error: "Unknown resource" };
  const data = parseBody(body, def.fields);

  try {
    switch (def.model) {
      case "project": {
        const item = await prisma.project.update({
          where: { id },
          data: mapProjectWriteData(data),
        });
        return { item: serializeRow(item as Row) };
      }
      case "unit": {
        const item = await prisma.unit.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "area": {
        const item = await prisma.area.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "projectType": {
        const item = await prisma.projectType.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "progress": {
        const item = await prisma.progress.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "adFloorPrice": {
        const item = await prisma.adFloorPrice.update({
          where: { id },
          data: mapAdFloorPriceWriteData(data),
        });
        return { item: serializeRow(item as Row) };
      }
      case "builder": {
        const item = await prisma.builder.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "user": {
        const item = await prisma.user.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "broker": {
        const item = await prisma.broker.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "inquiry": {
        const item = await prisma.inquiry.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "blog": {
        const item = await prisma.blog.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "blogCategory": {
        const item = await prisma.blogCategory.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "review": {
        const item = await prisma.review.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "contactUs": {
        const item = await prisma.contactUs.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "amenity": {
        const item = await prisma.amenity.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "utility": {
        const item = await prisma.utility.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "tag": {
        const item = await prisma.tag.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "roomType": {
        const item = await prisma.roomType.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "voucher": {
        const item = await prisma.voucher.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "team": {
        const item = await prisma.team.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      case "video": {
        if (!(await tableExists("videos"))) {
          return { item: null, error: "Videos table not available on this database" };
        }
        await executeRaw(
          `UPDATE videos SET title = ?, url = ?, project_id = ?, description = ? WHERE id = ?`,
          String(data.title ?? ""),
          String(data.url ?? ""),
          Number(data.projectId),
          (data.description as string) ?? null,
          id
        );
        const rows = await queryRaw<Row[]>(
          `SELECT id, title, url, description, project_id AS projectId FROM videos WHERE id = ?`,
          id
        );
        return { item: serializeRow(rows[0] ?? {}) };
      }
      case "customer": {
        const item = await prisma.user.update({ where: { id }, data: data as never });
        return { item: serializeRow(item as Row) };
      }
      default:
        return { item: null, error: "Update not implemented" };
    }
  } catch (e) {
    return { item: null, error: String(e) };
  }
}

export async function adminDelete(
  resourceId: string,
  id: number
): Promise<{ success: boolean; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };
  const def = getResourceById(resourceId);
  if (!def?.canDelete) return { success: false, error: "Delete not allowed" };

  try {
    switch (def.model) {
      case "project":
        await prisma.project.update({ where: { id }, data: { isArchive: true } });
        break;
      case "unit":
        await prisma.unit.update({ where: { id }, data: { isArchive: true } });
        break;
      case "area":
        await prisma.area.delete({ where: { id } });
        break;
      case "projectType":
        await prisma.projectType.delete({ where: { id } });
        break;
      case "inquiry":
        await prisma.inquiry.delete({ where: { id } });
        break;
      case "blog":
        await prisma.blog.delete({ where: { id } });
        break;
      case "blogCategory":
        await prisma.blogCategory.delete({ where: { id } });
        break;
      case "review":
        await prisma.review.delete({ where: { id } });
        break;
      case "contactUs":
        await prisma.contactUs.delete({ where: { id } });
        break;
      case "userSearchHistory":
        await prisma.userSearchHistory.delete({ where: { id } });
        break;
      case "adFloorPrice":
        await prisma.adFloorPrice.delete({ where: { id } });
        break;
      case "wishlist":
        await prisma.wishlist.delete({ where: { id } });
        break;
      case "amenity":
        await prisma.amenity.update({ where: { id }, data: { isArchive: true } });
        break;
      case "utility":
        await prisma.utility.update({ where: { id }, data: { isArchive: true } });
        break;
      case "tag":
        await prisma.tag.update({ where: { id }, data: { isArchive: true } });
        break;
      case "roomType":
        await prisma.roomType.update({ where: { id }, data: { isArchive: true } });
        break;
      case "voucher":
        await prisma.voucher.delete({ where: { id } });
        break;
      case "team":
        await prisma.team.delete({ where: { id } });
        break;
      case "paymentSchedule":
        await prisma.paymentSchedule.delete({ where: { id } });
        break;
      case "video": {
        if (await tableExists("videos")) {
          await executeRaw(`DELETE FROM videos WHERE id = ?`, id);
        }
        break;
      }
      case "activityLog":
        await prisma.activityLog.delete({ where: { id: BigInt(id) } });
        break;
      case "userVoucher":
        await prisma.userVoucher.delete({ where: { id } });
        break;
      default:
        return { success: false, error: "Delete not implemented" };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function adminDashboardStats(
  builderProjectIds?: number[]
): Promise<Record<string, number>> {
  if (!isDatabaseEnabled()) return {};

  if (builderProjectIds !== undefined) {
    if (!builderProjectIds.length) {
      return {
        projects: 0,
        units: 0,
        inquiries: 0,
        reviews: 0,
        vouchers: 0,
        paymentSchedules: 0,
        downloadedVouchers: 0,
      };
    }
    const projectFilter = { projectId: { in: builderProjectIds } };
    const [projects, units, inquiries, reviews, paymentSchedules, vouchers, downloadedVouchers] =
      await Promise.all([
        prisma.project.count({
          where: { id: { in: builderProjectIds }, isArchive: false },
        }),
        prisma.unit.count({
          where: { ...projectFilter, isArchive: false },
        }),
        prisma.inquiry.count({ where: projectFilter }),
        prisma.review.count({ where: projectFilter }),
        prisma.paymentSchedule.count({ where: projectFilter }),
        prisma.voucher.count({ where: { modelId: { in: builderProjectIds } } }).catch(() => 0),
        prisma.userVoucher
          .count({
            where: { voucher: { modelId: { in: builderProjectIds } } },
          })
          .catch(() => 0),
      ]);
    return {
      projects,
      units,
      inquiries,
      reviews,
      vouchers,
      paymentSchedules,
      downloadedVouchers,
    };
  }

  const entries: [string, () => Promise<number>][] = [
    ["projects", () => prisma.project.count({ where: { isArchive: false } })],
    ["units", () => prisma.unit.count({ where: { isArchive: false } })],
    ["users", () => prisma.user.count()],
    ["inquiries", () => prisma.inquiry.count()],
    ["blogs", () => prisma.blog.count()],
    ["reviews", () => prisma.review.count()],
    ["contacts", () => prisma.contactUs.count()],
    [
      "brokers",
      async () => {
        try {
          return await prisma.broker.count({ where: { isArchive: false } });
        } catch (e) {
          const msg = String(e instanceof Error ? e.message : e);
          if (msg.includes("does not exist")) {
            return prisma.user.count({ where: { userTypeId: -10027, isArchive: false } });
          }
          throw e;
        }
      },
    ],
    ["vouchers", () => prisma.voucher.count()],
    ["tags", () => prisma.tag.count({ where: { isArchive: false } })],
    ["amenities", () => prisma.amenity.count({ where: { isArchive: false } })],
    ["utilities", () => prisma.utility.count({ where: { isArchive: false } })],
    ["teams", () => prisma.team.count()],
    ["activityLogs", () => prisma.activityLog.count()],
    ["customers", () => prisma.user.count({ where: { userTypeId: -10024, isArchive: false } })],
    ["paymentSchedules", () => prisma.paymentSchedule.count()],
    ["downloadedVouchers", () => prisma.userVoucher.count()],
    [
      "progress",
      async () => {
        const rows = await queryRaw<{ cnt: bigint }[]>(
          `SELECT COUNT(*) AS cnt FROM progress_status`
        );
        return Number(rows[0]?.cnt ?? 0);
      },
    ],
  ];
  const stats: Record<string, number> = {};
  await Promise.all(
    entries.map(async ([key, fn]) => {
      try {
        stats[key] = await fn();
      } catch {
        /* skip broken model counts */
      }
    })
  );
  return stats;
}
