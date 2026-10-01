import {
  addCompareWithUnit,
  clearCompare,
  getCompareList,
  removeFromCompare,
  setCompareUnit,
  swapCompareProject,
  toggleCompare,
  type CompareEntry,
  type ToggleCompareResult,
} from "@/lib/client/compare-store";
import { pushCompareToServer } from "@/lib/client/compare-sync";

export type CompareSwapRequest = {
  pending: { id: number; slug: string; unitId?: number | null };
  current: CompareEntry[];
};

type SwapHandler = (request: CompareSwapRequest) => void;

let swapHandler: SwapHandler | null = null;

export function registerCompareSwapHandler(handler: SwapHandler | null) {
  swapHandler = handler;
}

async function afterCompareChange() {
  await pushCompareToServer();
}

export function requestToggleCompare(id: number, slug: string): ToggleCompareResult {
  const result = toggleCompare(id, slug);
  if (result.rejected) {
    swapHandler?.({ pending: { id, slug }, current: getCompareList() });
    return result;
  }
  if (result.added || result.removed) {
    void afterCompareChange();
  }
  return result;
}

export function requestAddCompareWithUnit(
  projectId: number,
  slug: string,
  unitId: number
): ToggleCompareResult {
  const result = addCompareWithUnit(projectId, slug, unitId);
  if (result.rejected) {
    swapHandler?.({ pending: { id: projectId, slug, unitId }, current: getCompareList() });
    return result;
  }
  if (result.added) {
    void afterCompareChange();
  } else if (!result.removed) {
    void afterCompareChange();
  }
  return result;
}

export function confirmCompareSwap(replaceProjectId: number, pending: CompareSwapRequest["pending"]) {
  const result = swapCompareProject(replaceProjectId, {
    id: pending.id,
    slug: pending.slug,
    unitId: pending.unitId ?? null,
  });
  void afterCompareChange();
  return result;
}

export function requestSetCompareUnit(projectId: number, unitId: number | null) {
  setCompareUnit(projectId, unitId);
  void afterCompareChange();
}

export async function requestRemoveFromCompare(id: number) {
  removeFromCompare(id);
  await afterCompareChange();
}

export async function requestClearCompare() {
  clearCompare();
  await afterCompareChange();
}
