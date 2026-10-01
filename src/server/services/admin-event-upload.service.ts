import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { imageExtension, validateImageFile } from "@/lib/admin-file-upload";

export async function saveEventCoverImage(file: File): Promise<{
  filename: string | null;
  error?: string;
}> {
  if (!file.size) return { filename: null };
  // Images only — an .html/.svg/.php upload here would be served from the site's own domain.
  const check = validateImageFile(file);
  if (!check.ok) return { filename: null, error: check.error };

  const safeExt = imageExtension(file);
  const filename = `event_${Date.now()}${safeExt}`;
  const dir = path.join(process.cwd(), "public", "uploads", "events");

  try {
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buf);
    return { filename: `/uploads/events/${filename}` };
  } catch (e) {
    return { filename: null, error: String(e) };
  }
}
