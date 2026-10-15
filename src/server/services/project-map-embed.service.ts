import { columnExists } from "@/lib/db-table-exists";
import { isDatabaseEnabled } from "@/lib/db";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { googleMapEmbedSrc, parseGoogleMapEmbed, type GoogleMapEmbed } from "@/lib/google-map-embed";

/**
 * Google Maps embed per project, in projects.map_embed_url through raw SQL
 * (see prisma/manual-migrations/2026-10-15-project-map-embed.sql).
 */

/** True once the SQL has been applied (checked once per process; restart after applying). */
export async function mapEmbedReady(): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;
  try {
    return await columnExists("projects", "map_embed_url");
  } catch {
    return false;
  }
}

/** The project's embed src, or null when it has none (or the SQL isn't applied yet). */
export async function loadProjectMapEmbed(projectId: number): Promise<string | null> {
  if (!(await mapEmbedReady())) return null;
  try {
    const rows = await queryRaw<{ map_embed_url: string | null }[]>(
      `SELECT map_embed_url FROM projects WHERE id = ? LIMIT 1`,
      projectId
    );
    return googleMapEmbedSrc(rows[0]?.map_embed_url);
  } catch (e) {
    console.error("[map-embed] load failed", e);
    return null;
  }
}

/**
 * Checks pasted embed text from the admin form. `embed` is null when the field was cleared.
 * Gives an error message when the text isn't a Google Maps embed or the column is missing.
 */
export async function checkMapEmbedInput(
  value: unknown
): Promise<{ embed: GoogleMapEmbed | null; error?: undefined } | { error: string }> {
  const parsed = parseGoogleMapEmbed(typeof value === "string" ? value : "");
  if (parsed && "error" in parsed) return { error: parsed.error };
  if (parsed && !(await mapEmbedReady())) {
    return { error: "The Google Maps embed is not set up yet. Run the project map embed SQL, then restart the app." };
  }
  return { embed: parsed };
}

export async function saveProjectMapEmbed(projectId: number, embed: GoogleMapEmbed | null): Promise<void> {
  if (!(await mapEmbedReady())) return;
  await executeRaw(`UPDATE projects SET map_embed_url = ? WHERE id = ?`, embed?.src ?? null, projectId);
}
