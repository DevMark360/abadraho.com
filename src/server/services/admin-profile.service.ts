import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isDatabaseEnabled } from "@/lib/db";
import type { AdminSession } from "@/lib/admin-session";
import {
  profileImageUrl,
  saveAdminProfileImage,
} from "@/server/services/admin-profile-upload.service";
import { checkStoredPhone } from "@/lib/phone";

export type ProfileUpdateInput = {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  city?: string;
  address?: string;
  aboutMe?: string;
  name?: string;
  imageFile?: File | null;
};

export function parseProfileUpdatePayload(
  source: FormData | Record<string, unknown>
): ProfileUpdateInput {
  if (source instanceof FormData) {
    const image = source.get("image");
    return {
      firstName: pickStr(source, "first_name", "firstName"),
      lastName: pickStr(source, "last_name", "lastName"),
      username: pickStr(source, "username"),
      email: pickStr(source, "email"),
      phoneNumber: pickStr(source, "phone_number", "phoneNumber"),
      city: pickStr(source, "city"),
      address: pickStr(source, "Address", "address"),
      aboutMe: pickStr(source, "about_me", "aboutMe"),
      name: pickStr(source, "name"),
      imageFile:
        image instanceof File && image.size > 0 ? image : null,
    };
  }
  const b = source;
  return {
    firstName: pickStrObj(b, "first_name", "firstName"),
    lastName: pickStrObj(b, "last_name", "lastName"),
    username: pickStrObj(b, "username"),
    email: pickStrObj(b, "email"),
    phoneNumber: pickStrObj(b, "phone_number", "phoneNumber"),
    city: pickStrObj(b, "city"),
    address: pickStrObj(b, "Address", "address"),
    aboutMe: pickStrObj(b, "about_me", "aboutMe"),
    name: pickStrObj(b, "name"),
    imageFile: null,
  };
}

function pickStr(fd: FormData, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = fd.get(k);
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

function pickStrObj(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

export type AdminProfileDto = {
  source: "admin" | "user";
  id: number;
  email: string;
  name: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  city?: string | null;
  address?: string | null;
  aboutMe?: string | null;
  image?: string | null;
  imageUrl?: string | null;
};

export async function getAdminProfile(
  session: AdminSession
): Promise<{ profile: AdminProfileDto | null; error?: string }> {
  if (!isDatabaseEnabled()) return { profile: null, error: "Database disabled" };

  if (session.source === "user") {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return { profile: null, error: "Not found" };
    return {
      profile: {
        source: "user",
        id: user.id,
        email: user.email ?? session.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        city: user.city,
        address: user.address,
        aboutMe: user.aboutMe,
        image: user.image,
        imageUrl: profileImageUrl(user.image),
      },
    };
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.id } });
  if (!admin) return { profile: null, error: "Not found" };
  return {
    profile: {
      source: "admin",
      id: admin.id,
      email: admin.email,
      name: admin.name,
      imageUrl: null,
    },
  };
}

export async function updateAdminProfile(
  session: AdminSession,
  data: ProfileUpdateInput
): Promise<{
  success: boolean;
  message: string;
  profile?: AdminProfileDto;
  session?: AdminSession;
}> {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };

  if (data.phoneNumber !== undefined) {
    const phoneCheck = checkStoredPhone(data.phoneNumber);
    if (!phoneCheck.ok) return { success: false, message: phoneCheck.message };
    data = { ...data, phoneNumber: phoneCheck.stored };
  }

  if (session.source === "user") {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return { success: false, message: "User not found" };

    const firstName = data.firstName?.trim() ?? user.firstName;
    if (!firstName) {
      return { success: false, message: "First name is required" };
    }

    const email = data.email?.trim() ?? user.email ?? "";
    if (email && email !== user.email) {
      const taken = await prisma.user.findFirst({
        where: { email, id: { not: session.id }, isArchive: false },
      });
      if (taken) return { success: false, message: "Email is already in use" };
    }

    let imageFilename = user.image;
    if (data.imageFile) {
      const saved = await saveAdminProfileImage(data.imageFile, user.image);
      if ("error" in saved) return { success: false, message: saved.error };
      imageFilename = saved.filename;
    }

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: {
        firstName,
        lastName: data.lastName?.trim() ?? user.lastName,
        username: data.username?.trim() ?? user.username,
        email: email || user.email,
        phoneNumber: data.phoneNumber?.trim() ?? user.phoneNumber,
        city: data.city?.trim() ?? user.city,
        address: data.address?.trim() ?? user.address,
        aboutMe: data.aboutMe?.trim() ?? user.aboutMe,
        image: imageFilename,
      },
    });

    const displayName = [updated.firstName, updated.lastName].filter(Boolean).join(" ").trim();
    const profile: AdminProfileDto = {
      source: "user",
      id: updated.id,
      email: updated.email ?? session.email,
      name: displayName || null,
      username: updated.username,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phoneNumber: updated.phoneNumber,
      city: updated.city,
      address: updated.address,
      aboutMe: updated.aboutMe,
      image: updated.image,
      imageUrl: profileImageUrl(updated.image),
    };

    return {
      success: true,
      message: "Your Profile Has Been Updated",
      profile,
      session: {
        ...session,
        email: profile.email,
        name: profile.name,
      },
    };
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.id } });
  if (!admin) return { success: false, message: "Admin not found" };

  const displayName =
    data.name?.trim() ||
    [data.firstName, data.lastName].filter(Boolean).join(" ").trim() ||
    admin.name;
  const email = data.email?.trim() ?? admin.email;

  if (email !== admin.email) {
    const taken = await prisma.admin.findFirst({
      where: { email, id: { not: session.id } },
    });
    if (taken) return { success: false, message: "Email is already in use" };
  }

  const updated = await prisma.admin.update({
    where: { id: session.id },
    data: { name: displayName ?? admin.name, email },
  });

  const profile: AdminProfileDto = {
    source: "admin",
    id: updated.id,
    email: updated.email,
    name: updated.name,
    imageUrl: null,
  };

  return {
    success: true,
    message: "Your Profile Has Been Updated",
    profile,
    session: {
      ...session,
      email: updated.email,
      name: updated.name,
    },
  };
}

export async function changeAdminPassword(
  session: AdminSession,
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };
  if (newPassword.length < 8) {
    return { success: false, message: "New password must be at least 8 characters" };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, message: "Passwords do not match" };
  }
  if (oldPassword === newPassword) {
    return { success: false, message: "New password must differ from old password" };
  }

  const hash = await hashPassword(newPassword);

  if (session.source === "user") {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user?.password) return { success: false, message: "User not found" };
    if (!(await verifyPassword(oldPassword, user.password))) {
      return { success: false, message: "The old password does not match" };
    }
    await prisma.user.update({ where: { id: session.id }, data: { password: hash } });
    return { success: true, message: "Password Changed Successfully." };
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.id } });
  if (!admin?.password) return { success: false, message: "Admin not found" };
  if (!(await verifyPassword(oldPassword, admin.password))) {
    return { success: false, message: "The old password does not match" };
  }
  await prisma.admin.update({ where: { id: session.id }, data: { password: hash } });
  return { success: true, message: "Password Changed Successfully." };
}
