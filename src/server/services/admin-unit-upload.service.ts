import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  imageExtension,
  resolveUploadPath,
  sanitizeUploadFilename,
  validateImageFile,
} from "@/lib/admin-file-upload";

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

function safeStoredFilename(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadUnitPlanImages(
  unitId: number,
  files: {
    floorPlan?: File | null;
    paymentPlan?: File | null;
    removeFloorPlan?: boolean;
    removePaymentPlan?: boolean;
  }
): Promise<{ error?: string }> {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, isArchive: false },
    select: { id: true, projectId: true, floorPlanImg: true, paymentPlanImg: true },
  });
  if (!unit) return { error: "Unit not found" };

  const dir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "project_images",
    `project_${unit.projectId}`,
    `unit_${unit.id}`
  );

  let floorPlanImg = unit.floorPlanImg;
  let paymentPlanImg = unit.paymentPlanImg;

  try {
    if (files.removeFloorPlan && floorPlanImg) {
      try {
        await unlink(resolveUploadPath(dir, safeStoredFilename(floorPlanImg)));
      } catch {
        /* ignore */
      }
      floorPlanImg = null;
    }
    if (files.removePaymentPlan && paymentPlanImg) {
      try {
        await unlink(resolveUploadPath(dir, safeStoredFilename(paymentPlanImg)));
      } catch {
        /* ignore */
      }
      paymentPlanImg = null;
    }

    if (files.floorPlan?.size) {
      const validation = validateImageFile(files.floorPlan);
      if (!validation.ok) return { error: validation.error };
      await ensureDir(dir);
      const fname = `floor_plan_${Date.now()}${imageExtension(files.floorPlan)}`;
      await writeFile(
        resolveUploadPath(dir, fname),
        Buffer.from(await files.floorPlan.arrayBuffer())
      );
      floorPlanImg = fname;
    }

    if (files.paymentPlan?.size) {
      const validation = validateImageFile(files.paymentPlan);
      if (!validation.ok) return { error: validation.error };
      await ensureDir(dir);
      const fname = `payment_plan_${Date.now()}${imageExtension(files.paymentPlan)}`;
      await writeFile(
        resolveUploadPath(dir, fname),
        Buffer.from(await files.paymentPlan.arrayBuffer())
      );
      paymentPlanImg = fname;
    }

    await prisma.unit.update({
      where: { id: unitId },
      data: { floorPlanImg, paymentPlanImg },
    });

    return {};
  } catch (e) {
    return { error: String(e) };
  }
}
