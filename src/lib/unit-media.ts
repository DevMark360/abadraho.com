import { v2ProjectAssetUrl } from "@/lib/project-media";

/** v2 public: /uploads/project_images/project_{pid}/unit_{uid}/{filename} */
export function unitPlanImageUrl(
  projectId: number,
  unitId: number,
  filename: string | null | undefined
): string | null {
  if (!filename?.trim()) return null;
  return v2ProjectAssetUrl(
    `uploads/project_images/project_${projectId}/unit_${unitId}/${filename.replace(/^\//, "")}`
  );
}
