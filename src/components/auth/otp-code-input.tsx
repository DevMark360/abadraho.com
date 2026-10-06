"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Segmented one-time-code input (one box per digit). Auto-advances, Backspace steps back,
 * pasting "1234" fills every box, and the first box accepts SMS/WhatsApp autofill.
 */
export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  length = 4,
  error = false,
  disabled = false,
  autoFocus = true,
}: {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function setAt(index: number, chars: string) {
    const next = digits.slice();
    // Never leave gaps: typing into a later box fills the first empty one instead.
    const firstEmpty = digits.findIndex((d) => !d);
    let i = firstEmpty === -1 ? index : Math.min(index, firstEmpty);
    for (const ch of chars.replace(/\D/g, "")) {
      if (i >= length) break;
      next[i] = ch;
      i += 1;
    }
    const code = next.join("").slice(0, length);
    onChange(code);
    refs.current[Math.min(i, length - 1)]?.focus();
    if (code.length === length && !next.includes("")) onComplete?.(code);
  }

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3" role="group" aria-label="Verification code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? length : 1}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={error || undefined}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              const next = digits.slice();
              next[i] = "";
              onChange(next.join(""));
              return;
            }
            setAt(i, v.length > 1 ? v : v.slice(-1));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              e.preventDefault();
              const next = digits.slice();
              next[i - 1] = "";
              onChange(next.join(""));
              refs.current[i - 1]?.focus();
            } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            else if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            setAt(0, e.clipboardData.getData("text"));
          }}
          className={cn(
            "h-14 w-12 rounded-xl border-2 bg-white text-center text-2xl font-semibold text-zinc-900 outline-none transition-colors sm:h-16 sm:w-14",
            "focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/10 disabled:opacity-60",
            error ? "border-red-400 text-red-700" : "border-zinc-200"
          )}
        />
      ))}
    </div>
  );
}
