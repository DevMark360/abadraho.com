import { mkdir, unlink, writeFile } from "fs/promises";
import path from "node:path";

const PROFILE_DIR = path.join(process.cwd(), "public", "uploads", "profile");

export function profileImageUrl(filename: string | null | undefined): string | null {
  if (!filename?.trim()) return null;
  return `/uploads/profile/${filename}`;
}

export async function saveAdminProfileImage(
  file: File,
  previousFilename?: string | null
): Promise<{ filename: string } | { error: string }> {
  if (!file.size) return { error: "Empty file" };
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  if (![".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    return { error: "Image must be JPG, PNG, GIF, or WebP" };
  }
  if (file.size > 5 * 1024 * 1024) return { error: "Image must be under 5MB" };

  await mkdir(PROFILE_DIR, { recursive: true });

  if (previousFilename?.trim()) {
    const oldPath = path.join(PROFILE_DIR, previousFilename);
    await unlink(oldPath).catch(() => {});
  }

  const filename = `${Date.now()}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(PROFILE_DIR, filename), buf);
  return { filename };
}
