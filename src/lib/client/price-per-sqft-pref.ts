"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const STORAGE_KEY = "abadraho:price-per-sqft";
const CHANGE_EVENT = "abadraho:price-per-sqft-change";

/** Set once the visitor toggles, so the choice holds even where storage is blocked. */
let current: boolean | null = null;

function readPref(): boolean {
  if (current != null) return current;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  const fromOtherTab = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    current = e.newValue === "1";
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", fromOtherTab);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", fromOtherTab);
  };
}

export function setPricePerSqFtPref(on: boolean) {
  current = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* storage blocked: `current` keeps the choice until the next reload */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The visitor's "show price per sq.ft" choice, remembered in this browser. */
export function usePricePerSqFtPref(): boolean {
  return useSyncExternalStore(subscribe, readPref, () => false);
}

/** Only the projects listing turns this on, so cards elsewhere always show the full price. */
export const PricePerSqFtScope = createContext(false);

/** True when project cards should show price per sq.ft instead of the full price. */
export function useCardPricePerSqFt(): boolean {
  const inScope = useContext(PricePerSqFtScope);
  const on = usePricePerSqFtPref();
  return inScope && on;
}
