import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { isDatabaseEnabled } from "@/lib/db";
import { tableExists, columnExists } from "@/lib/db-table-exists";
import { jsonNum, jsonNumOrNull } from "@/lib/prisma-json";
import {
  defaultUserTypeOptions,
  userTypeIds,
  userTypeLabel,
} from "@/config/site";

export type UserListFilters = {
  page?: number;
  perPage?: number;
  userName?: string;
  userEmail?: string;
  userTypeIds?: number[];
};

export type UserTypeOption = { id: number; name: string };

function rowStaffRoleName(row: object): string | null {
  if (!("staff_role_name" in row)) return null;
  const name = row.staff_role_name;
  return typeof name === "string" && name.trim() ? name : null;
}

export async function loadUserTypesForAdmin(): Promise<UserTypeOption[]> {
  if (!isDatabaseEnabled()) return defaultUserTypeOptions();

  try {
    if (!(await tableExists("user_types"))) {
      return defaultUserTypeOptions();
    }

    const rows = await queryRaw<{ id: number; name: string }[]>(
      `SELECT id, user_type_name AS name FROM user_types WHERE id != ? ORDER BY user_type_name`,
      userTypeIds.superAdmin
    );
    return rows.map((r) => ({ id: jsonNum(r.id), name: r.name }));
  } catch {
    return defaultUserTypeOptions();
  }
}

export async function listAdminUsers(filters: UserListFilters = {}) {
  if (!isDatabaseEnabled()) return { items: [], total: 0, error: "Database disabled" };

  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 50, 200);
  const skip = (page - 1) * perPage;

  const conditions: string[] = ["u.is_archive = 0"];
  const params: unknown[] = [];

  if (filters.userEmail?.trim()) {
    conditions.push("u.email = ?");
    params.push(filters.userEmail.trim());
  }

  if (filters.userName?.trim()) {
    const parts = filters.userName.trim().split(/\s+/);
    conditions.push("u.first_name LIKE ?");
    params.push(`%${parts[0]}%`);
    if (parts.length > 1) {
      conditions.push("u.last_name LIKE ?");
      params.push(`%${parts[1]}%`);
    }
  }

  if (filters.userTypeIds?.length) {
    conditions.push(
      `u.user_type_id IN (${filters.userTypeIds.map(() => "?").join(",")})`
    );
    params.push(...filters.userTypeIds);
  }

  const where = conditions.join(" AND ");

  try {
    const hasUserTypes = await tableExists("user_types");
    const hasStaffRolesTable = await tableExists("staff_roles");
    const hasStaffRoleColumn = await columnExists("users", "staff_role_id");
    const includeStaffRole = hasStaffRoleColumn;
    const joinStaffRoleName = hasStaffRolesTable && hasStaffRoleColumn;

    const countRows = await queryRaw<{ cnt: bigint }[]>(
      `SELECT COUNT(*) AS cnt FROM users u WHERE ${where}`,
      ...params
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const staffRoleSelect = includeStaffRole
      ? joinStaffRoleName
        ? `u.staff_role_id, sr.name AS staff_role_name`
        : `u.staff_role_id, NULL AS staff_role_name`
      : "";

    const staffRoleJoin = joinStaffRoleName
      ? `LEFT JOIN staff_roles sr ON sr.id = u.staff_role_id`
      : "";

    const rows = hasUserTypes
      ? includeStaffRole
        ? await queryRaw<
            {
              id: number;
              first_name: string;
              last_name: string | null;
              phone_number: string | null;
              email: string | null;
              user_type_id: number | null;
              staff_role_id: number | null;
              created_at: Date | null;
              type_name: string | null;
              staff_role_name: string | null;
            }[]
          >(
            `SELECT u.id, u.first_name, u.last_name, u.phone_number, u.email, u.user_type_id,
                    u.created_at, ut.user_type_name AS type_name,
                    ${staffRoleSelect}
             FROM users u
             LEFT JOIN user_types ut ON ut.id = u.user_type_id
             ${staffRoleJoin}
             WHERE ${where}
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?`,
            ...params,
            perPage,
            skip
          )
        : await queryRaw<
            {
              id: number;
              first_name: string;
              last_name: string | null;
              phone_number: string | null;
              email: string | null;
              user_type_id: number | null;
              created_at: Date | null;
              type_name: string | null;
            }[]
          >(
            `SELECT u.id, u.first_name, u.last_name, u.phone_number, u.email, u.user_type_id, u.created_at,
                    ut.user_type_name AS type_name
             FROM users u
             LEFT JOIN user_types ut ON ut.id = u.user_type_id
             WHERE ${where}
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?`,
            ...params,
            perPage,
            skip
          )
      : await queryRaw<
          {
            id: number;
            first_name: string;
            last_name: string | null;
            phone_number: string | null;
            email: string | null;
            user_type_id: number | null;
            created_at: Date | null;
          }[]
        >(
          `SELECT u.id, u.first_name, u.last_name, u.phone_number, u.email, u.user_type_id, u.created_at
           FROM users u
           WHERE ${where}
           ORDER BY u.created_at DESC
           LIMIT ? OFFSET ?`,
          ...params,
          perPage,
          skip
        );

    const roleNameById = new Map<number, string>();
    if (hasStaffRolesTable && hasStaffRoleColumn) {
      const unresolvedRoleIds = new Set<number>();
      for (const r of rows) {
        if (!("staff_role_id" in r) || r.staff_role_id == null) continue;
        const roleId = jsonNum(r.staff_role_id);
        const joinedName = rowStaffRoleName(r);
        if (joinedName) {
          roleNameById.set(roleId, joinedName);
        } else {
          unresolvedRoleIds.add(roleId);
        }
      }
      if (unresolvedRoleIds.size > 0) {
        const ids = [...unresolvedRoleIds];
        const roleRows = await queryRaw<{ id: number; name: string }[]>(
          `SELECT id, name FROM staff_roles WHERE id IN (${ids.map(() => "?").join(",")})`,
          ...ids
        );
        for (const role of roleRows) {
          roleNameById.set(jsonNum(role.id), role.name);
        }
      }
    }

    const items = rows.map((r, i) => {
      const userTypeId = jsonNumOrNull(r.user_type_id);
      const staffRoleId =
        "staff_role_id" in r && r.staff_role_id != null ? jsonNum(r.staff_role_id) : null;
      const staffRoleName =
        staffRoleId != null
          ? rowStaffRoleName(r) ?? roleNameById.get(staffRoleId) ?? null
          : null;

      return {
        rowNum: skip + i + 1,
        id: jsonNum(r.id),
        firstName: r.first_name,
        lastName: r.last_name,
        phoneNumber: r.phone_number,
        email: r.email,
        userTypeId,
        userTypeName:
          "type_name" in r && r.type_name
            ? r.type_name
            : userTypeLabel(userTypeId),
        staffRoleId,
        staffRoleName,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      };
    });

    return { items, total };
  } catch (e) {
    return { items: [], total: 0, error: String(e) };
  }
}

export type AdminUserDetail = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  username: string | null;
  city: string | null;
  address: string | null;
  aboutMe: string | null;
  userTypeId: number | null;
  userTypeName: string | null;
  createdAt: string | null;
};

export function formatAdminUserDetail(
  user: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    username: string | null;
    city: string | null;
    address: string | null;
    aboutMe: string | null;
    userTypeId: number | null;
    createdAt: Date | null;
  },
  userTypeName: string | null
): AdminUserDetail {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    username: user.username,
    city: user.city,
    address: user.address,
    aboutMe: user.aboutMe,
    userTypeId: user.userTypeId,
    userTypeName,
    createdAt: user.createdAt ? user.createdAt.toISOString() : null,
  };
}

export async function getAdminUser(id: number) {
  if (!isDatabaseEnabled()) return { user: null, error: "Database disabled" };
  const user = await prisma.user.findFirst({
    where: { id, isArchive: false },
  });
  if (!user) return { user: null, error: "Not found" };
  const types = await loadUserTypesForAdmin();
  const typeName = types.find((t) => t.id === user.userTypeId)?.name ?? null;
  return { user: formatAdminUserDetail(user, typeName) };
}

export async function saveAdminUser(
  id: number | null,
  body: Record<string, unknown>
): Promise<{ user: { id: number } | null; error?: string }> {
  if (!isDatabaseEnabled()) return { user: null, error: "Database disabled" };

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const userTypeId = Number(body.userTypeId);
  const phoneNumber = body.phoneNumber != null ? String(body.phoneNumber) : null;
  const password = body.password != null ? String(body.password) : "";

  if (!firstName || !lastName || !email || !Number.isFinite(userTypeId)) {
    return { user: null, error: "Name, email, and user type are required" };
  }

  if (userTypeId === userTypeIds.superAdmin) {
    return { user: null, error: "Cannot assign Super Admin via this form" };
  }

  try {
    const duplicate = await prisma.user.findFirst({
      where: {
        email,
        isArchive: false,
        ...(id != null ? { id: { not: id } } : {}),
      },
    });
    if (duplicate) return { user: null, error: "Email is already taken" };

    const username = `${firstName}${lastName}`.replace(/\s+/g, "");

    if (id == null) {
      if (!password || password.length < 8) {
        return { user: null, error: "Password is required (min 8 characters)" };
      }
      const now = new Date();
      const created = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          username,
          userTypeId,
          phoneNumber,
          password: await bcrypt.hash(password, 10),
          isArchive: false,
          createdAt: now,
          updatedAt: now,
        },
      });
      return { user: { id: created.id } };
    }

    const data: Record<string, unknown> = {
      firstName,
      lastName,
      email,
      username,
      userTypeId,
      phoneNumber,
    };
    if (password.length >= 8) {
      data.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({ where: { id }, data: data as never });
    return { user: { id } };
  } catch (e) {
    return { user: null, error: String(e) };
  }
}

export async function archiveAdminUser(id: number) {
  await prisma.user.update({
    where: { id },
    data: { isArchive: true },
  });
}

export type NotifiableUserOption = { id: number; name: string; email: string | null };

/** All non-archived website users, excluding admin/super-admin account types — for recipient pickers (e.g. "Notify users"). */
export async function listUsersForNotify(): Promise<NotifiableUserOption[]> {
  if (!isDatabaseEnabled()) return [];

  try {
    const rows = await prisma.user.findMany({
      where: {
        isArchive: false,
        userTypeId: { notIn: [userTypeIds.superAdmin, userTypeIds.admin] },
      },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    return rows.map((r) => ({
      id: r.id,
      name: [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || r.email || `User #${r.id}`,
      email: r.email,
    }));
  } catch {
    return [];
  }
}

export async function listAdminCustomers(filters: { page?: number; perPage?: number; q?: string }) {
  if (!isDatabaseEnabled()) return { items: [], total: 0, error: "Database disabled" };

  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 50, 200);
  const skip = (page - 1) * perPage;

  const where: {
    isArchive: boolean;
    userTypeId: number;
    OR?: { firstName?: { contains: string }; lastName?: { contains: string }; email?: { contains: string } }[];
  } = {
    isArchive: false,
    userTypeId: userTypeIds.websiteUser,
  };

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
    ];
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          isPhoneNoVerified: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const items = rows.map((r, i) => ({
      rowNum: skip + i + 1,
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phoneNumber: r.phoneNumber,
      isPhoneNoVerified: r.isPhoneNoVerified,
      createdAt: r.createdAt,
    }));

    return { items, total };
  } catch (e) {
    return { items: [], total: 0, error: String(e) };
  }
}
