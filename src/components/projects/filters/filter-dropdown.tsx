"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const MOBILE_BP = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function FilterDropdown({
  open,
  onClose,
  anchorRef,
  align = "left",
  width = "md",
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  align?: "left" | "center";
  width?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 480 });
  const [mounted, setMounted] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => setMounted(true), []);

  // useLayoutEffect (not useEffect) — runs before paint, so the panel is positioned
  // correctly in the same frame it first renders instead of flashing at the
  // {top:0, left:0} initial state for a frame (the top-left corner "blink").
  useLayoutEffect(() => {
    if (!open || isMobile) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const panelWidth = panel?.offsetWidth ?? 360;
      let left = rect.left;

      if (align === "center") {
        left = rect.left + rect.width / 2 - panelWidth / 2;
      }

      const maxLeft = window.innerWidth - panelWidth - 12;
      left = Math.max(12, Math.min(left, maxLeft));

      const panelHeight = panel?.offsetHeight ?? 400;
      const margin = 12;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const preferBelow = spaceBelow >= Math.min(panelHeight, 280) || spaceBelow >= spaceAbove;

      let top = preferBelow ? rect.bottom + 8 : rect.top - panelHeight - 8;
      let maxHeight = preferBelow ? spaceBelow - 8 : spaceAbove - 8;

      if (top < margin) {
        top = margin;
        maxHeight = window.innerHeight - margin * 2;
      }
      if (top + panelHeight > window.innerHeight - margin) {
        maxHeight = Math.min(maxHeight, window.innerHeight - top - margin);
      }

      maxHeight = Math.max(200, Math.min(maxHeight, window.innerHeight - margin * 2));

      setPosition({ top, left, maxHeight });
    };

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, align, width, isMobile]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open || !isMobile) {
      setSheetVisible(false);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => setSheetVisible(true));

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      setSheetVisible(false);
    };
  }, [open, isMobile, onClose]);

  if (!open || !mounted) return null;

  const widths = {
    sm: "w-[280px]",
    md: "w-[360px]",
    lg: "w-[480px]",
    xl: "w-[560px]",
  };

  if (isMobile) {
    return createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-[1199] bg-black/40"
          onClick={onClose}
          aria-label="Close filter panel"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            "filter-dropdown-panel filter-dropdown-panel--sheet",
            sheetVisible && "is-visible",
            className
          )}
        >
          <span className="filter-dropdown-sheet-handle" aria-hidden />
          {children}
        </div>
      </>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      style={{
        top: position.top,
        left: position.left,
        maxHeight: position.maxHeight,
      }}
      className={cn(
        "filter-dropdown-panel filter-dropdown-panel--anchored",
        widths[width],
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}
