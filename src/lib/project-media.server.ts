import "server-only";
import { existsSync } from "fs";
import path from "path";
import { projectDocumentPublicRel } from "@/lib/project-media";

export function localProjectDocumentPath(projectId: number, docEntry: string): string {
  return path.join(process.cwd(), "public", projectDocumentPublicRel(projectId, docEntry));
}

export function localProjectDocumentExists(projectId: number, docEntry: string): boolean {
  try {
    return existsSync(localProjectDocumentPath(projectId, docEntry));
  } catch {
    return false;
  }
}
