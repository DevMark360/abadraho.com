import { allPermissionKeys, isValidPermissionKey } from "@/config/admin-permissions";
import { userTypeIds } from "@/config/site";
import { isDatabaseEnabled } from "@/lib/db";
import { clearStaffPermissionCache } from "@/lib/staff-rbac";
import { prisma } from "@/lib/prisma";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { jsonNum } from "@/lib/prisma-json";
import { tableExists } from "@/lib/db-table-exists";

export type StaffRoleRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  isSuperAdmin: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: string | null;
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function staffRolesTableReady(): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;
  return tableExists("staff_roles");
}

export async function ensureDefaultStaffRoles(): Promise<void> {
  if (!(await staffRolesTableReady())) return;

  const existing = await prisma.staffRole.findFirst({
    where: { slug: "super-admin" },
    select: { id: true },
  });
  if (existing) return;

  await prisma.staffRole.create({
    data: {
      name: "Super Admin",
      slug: "super-admin",
      description: "Full platform access. Cannot be deleted.",
      isSystem: true,
      isSuperAdmin: true,
    },
  });
}

export async function listStaffRoles(): Promise<{ items: StaffRoleRow[]; error?: string }> {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };
  if (!(await staffRolesTableReady())) {
    return { items: [], error: "Run scripts/sql/create-staff-roles-tables.sql on the database" };
  }

  await ensureDefaultStaffRoles();

  try {
    const rows = await queryRaw<
      {
        id: number;
        name: string;
        slug: string;
        description: string | null;
        is_system: number;
        is_super_admin: number;
        created_at: Date | null;
        perm_count: bigint;
        user_count: bigint;
      }[]
    >(
      `SELECT r.id, r.name, r.slug, r.description, r.is_system, r.is_super_admin, r.created_at,
              (SELECT COUNT(*) FROM staff_role_permissions p WHERE p.role_id = r.id) AS perm_count,
              (
                (SELECT COUNT(*) FROM users u WHERE u.staff_role_id = r.id AND u.is_archive = 0)
                + (SELECT COUNT(*) FROM admins a WHERE a.staff_role_id = r.id)
              ) AS user_count
       FROM staff_roles r
       ORDER BY r.is_super_admin DESC, r.name ASC`
    );

    return {
      items: rows.map((r) => ({
        id: jsonNum(r.id),
        name: r.name,
        slug: r.slug,
        description: r.description,
        isSystem: Boolean(r.is_system),
        isSuperAdmin: Boolean(r.is_super_admin),
        userCount: Number(r.user_count),
        permissionCount: r.is_super_admin ? allPermissionKeys().length : Number(r.perm_count),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      })),
    };
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function getStaffRole(id: number) {
  if (!(await staffRolesTableReady())) {
    return { role: null, error: "Roles tables not found" };
  }

  const row = await prisma.staffRole.findUnique({
    where: { id },
    include: {
      permissions: { select: { permissionKey: true } },
      users: {
        where: { isArchive: false },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          userTypeId: true,
        },
      },
      admins: { select: { id: true, name: true, email: true } },
    },
  });

  if (!row) return { role: null, error: "Not found" };

  const assignedUsers = [
    ...row.users.map((u) => ({
      id: u.id,
      source: "user" as const,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—",
      email: u.email ?? "",
      userTypeId: u.userTypeId,
    })),
    ...row.admins.map((a) => ({
      id: a.id,
      source: "admin" as const,
      name: a.name ?? a.email,
      email: a.email,
      userTypeId: userTypeIds.admin,
    })),
  ];

  return {
    role: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      isSystem: row.isSystem,
      isSuperAdmin: row.isSuperAdmin,
      permissions: row.isSuperAdmin ? allPermissionKeys() : row.permissions.map((p) => p.permissionKey),
      assignedUsers,
      userCount: assignedUsers.length,
    },
  };
}

export async function createStaffRole(input: {
  name: string;
  description?: string;
  permissions: string[];
}) {
  if (!(await staffRolesTableReady())) {
    return { success: false, message: "Roles tables not found" };
  }

  const name = input.name.trim();
  if (!name) return { success: false, message: "Role name is required" };

  const permissions = input.permissions.filter(isValidPermissionKey);
  if (!permissions.length) {
    return { success: false, message: "Select at least one permission" };
  }

  let slug = slugify(name);
  const taken = await prisma.staffRole.findFirst({ where: { slug }, select: { id: true } });
  if (taken) slug = `${slug}-${Date.now()}`;

  const row = await prisma.staffRole.create({
    data: {
      name,
      slug,
      description: input.description?.trim() || null,
      isSystem: false,
      isSuperAdmin: false,
      permissions: {
        create: permissions.map((permissionKey) => ({ permissionKey })),
      },
    },
    select: { id: true },
  });

  return { success: true, id: row.id };
}

export async function updateStaffRole(
  id: number,
  input: { name?: string; description?: string; permissions?: string[] }
) {
  if (!(await staffRolesTableReady())) {
    return { success: false, message: "Roles tables not found" };
  }

  const existing = await prisma.staffRole.findUnique({ where: { id } });
  if (!existing) return { success: false, message: "Role not found" };
  if (existing.isSuperAdmin) {
    return { success: false, message: "Super Admin role cannot be edited" };
  }

  const name = input.name?.trim();
  if (name !== undefined && !name) {
    return { success: false, message: "Role name is required" };
  }

  if (input.permissions) {
    const permissions = input.permissions.filter(isValidPermissionKey);
    if (!permissions.length) {
      return { success: false, message: "Select at least one permission" };
    }
    await prisma.staffRolePermission.deleteMany({ where: { roleId: id } });
    await prisma.staffRolePermission.createMany({
      data: permissions.map((permissionKey) => ({ roleId: id, permissionKey })),
    });
    clearStaffPermissionCache(id);
  }

  await prisma.staffRole.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() || null }
        : {}),
    },
  });

  return { success: true };
}

export async function deleteStaffRole(id: number) {
  if (!(await staffRolesTableReady())) {
    return { success: false, message: "Roles tables not found" };
  }

  const existing = await prisma.staffRole.findUnique({ where: { id } });
  if (!existing) return { success: false, message: "Role not found" };
  if (existing.isSystem || existing.isSuperAdmin) {
    return { success: false, message: "System roles cannot be deleted" };
  }

  const [userCount, adminCount] = await Promise.all([
    prisma.user.count({ where: { staffRoleId: id, isArchive: false } }),
    prisma.admin.count({ where: { staffRoleId: id } }),
  ]);
  if (userCount + adminCount > 0) {
    return {
      success: false,
      message: "Remove all assigned users before deleting this role",
    };
  }

  await prisma.staffRole.delete({ where: { id } });
  clearStaffPermissionCache(id);
  return { success: true };
}

const STAFF_ASSIGNABLE_USER_TYPES: number[] = [userTypeIds.superAdmin, userTypeIds.admin];

export async function searchStaffAssignableUsers(q: string) {
  if (!isDatabaseEnabled()) return [];

  const term = q.trim();
  const like = term ? `%${term}%` : "%";

  const users = await queryRaw<
    { id: number; first_name: string; last_name: string | null; email: string | null; staff_role_id: number | null }[]
  >(
    `SELECT id, first_name, last_name, email, staff_role_id
     FROM users
     WHERE is_archive = 0
       AND user_type_id IN (${STAFF_ASSIGNABLE_USER_TYPES.join(",")})
       AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
     ORDER BY first_name ASC
     LIMIT 25`,
    like,
    like,
    like
  );

  const admins = await queryRaw<
    { id: number; name: string | null; email: string; staff_role_id: number | null }[]
  >(
    `SELECT id, name, email, staff_role_id
     FROM admins
     WHERE (name LIKE ? OR email LIKE ?)
     ORDER BY email ASC
     LIMIT 25`,
    like,
    like
  );

  return [
    ...users.map((u) => ({
      source: "user" as const,
      id: jsonNum(u.id),
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "—",
      email: u.email ?? "",
      staffRoleId: u.staff_role_id != null ? jsonNum(u.staff_role_id) : null,
    })),
    ...admins.map((a) => ({
      source: "admin" as const,
      id: jsonNum(a.id),
      name: a.name ?? a.email,
      email: a.email,
      staffRoleId: a.staff_role_id != null ? jsonNum(a.staff_role_id) : null,
    })),
  ];
}

export async function assignUserToStaffRole(
  roleId: number,
  target: { source: "user" | "admin"; id: number }
) {
  if (!(await staffRolesTableReady())) {
    return { success: false, message: "Roles tables not found" };
  }

  const role = await prisma.staffRole.findUnique({ where: { id: roleId } });
  if (!role) return { success: false, message: "Role not found" };
  if (role.isSuperAdmin) {
    return { success: false, message: "Assign users to custom roles, not Super Admin" };
  }

  if (target.source === "user") {
    const user = await prisma.user.findFirst({
      where: { id: target.id, isArchive: false },
      select: { id: true, userTypeId: true },
    });
    if (!user?.userTypeId || !STAFF_ASSIGNABLE_USER_TYPES.includes(user.userTypeId)) {
      return { success: false, message: "User is not staff/admin" };
    }
    await executeRaw(`UPDATE users SET staff_role_id = ? WHERE id = ?`, roleId, target.id);
    return { success: true };
  }

  const admin = await prisma.admin.findUnique({ where: { id: target.id }, select: { id: true } });
  if (!admin) return { success: false, message: "Admin not found" };
  await executeRaw(`UPDATE admins SET staff_role_id = ? WHERE id = ?`, roleId, target.id);
  return { success: true };
}

export async function removeUserFromStaffRole(target: {
  source: "user" | "admin";
  id: number;
}) {
  if (target.source === "user") {
    await executeRaw(`UPDATE users SET staff_role_id = NULL WHERE id = ?`, target.id);
  } else {
    await executeRaw(`UPDATE admins SET staff_role_id = NULL WHERE id = ?`, target.id);
  }
  return { success: true };
}
