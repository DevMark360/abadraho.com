import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function saveBlogCoverImage(file: File): Promise<{
  filename: string | null;
  error?: string;
}> {
  if (!file.size) return { filename: null };
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) return { filename: null, error: "Cover image must be under 5MB" };

  const ext = path.extname(file.name) || ".jpg";
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "") || ".jpg";
  const filename = `cover_${Date.now()}${safeExt}`;
  const dir = path.join(process.cwd(), "public", "uploads", "blogs");

  try {
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buf);
    return { filename };
  } catch (e) {
    return { filename: null, error: String(e) };
  }
}
