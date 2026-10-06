"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { AdminSelect } from "@/components/admin/admin-select";
import { inputInlineClass } from "@/lib/form-styles";
import {
  checkPhone,
  DEFAULT_PHONE_COUNTRY,
  isCountryCode,
  phoneCountryOptions,
  splitStoredPhone,
  type PhoneCheck,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

export type PhoneInputProps = {
  /** Name of the hidden input carrying the international number (e.g. 923001234567). */
  name?: string;
  /** Saved value: international digits, +number, or legacy local (03001234567). */
  defaultValue?: string | null;
  /** Called on every change with the result of validation. */
  onChange?: (check: PhoneCheck & { country: CountryCode; national: string }) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Show errors immediately (e.g. after a failed submit) instead of after the first blur. */
  showErrors?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

/**
 * Phone field with a searchable country-code picker and live, per-country validation
 * (libphonenumber rules). Blocks native form submit while invalid via setCustomValidity.
 */
export function PhoneInput({
  name,
  defaultValue,
  onChange,
  required = true,
  disabled,
  id,
  className,
  showErrors,
  placeholder,
  "aria-label": ariaLabel,
}: PhoneInputProps) {
  const initial = useMemo(() => splitStoredPhone(defaultValue), [defaultValue]);
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const inputId = id ?? `phone-${autoId}`;
  const errorId = `${inputId}-error`;

  // Re-sync when the saved value changes (e.g. profile data finishes loading).
  useEffect(() => {
    setCountry(initial.country);
    setNational(initial.national);
  }, [initial]);

  const check = useMemo<PhoneCheck>(() => {
    if (!national.trim() && !required) return { ok: true, stored: "", e164: "" };
    return checkPhone(national, country);
  }, [national, country, required]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(check.ok ? "" : check.message);
  }, [check]);

  const options = useMemo(
    () =>
      phoneCountryOptions().map((c) => ({
        value: c.code,
        label: `${c.name} (${c.dial})`,
        keywords: `${c.code} ${c.dial} ${c.dial.slice(1)}`,
      })),
    []
  );
  const dial = phoneCountryOptions().find((c) => c.code === country)?.dial ?? "";

  function update(nextCountry: CountryCode, nextNational: string) {
    setCountry(nextCountry);
    setNational(nextNational);
    const next =
      !nextNational.trim() && !required
        ? ({ ok: true, stored: "", e164: "" } as const)
        : checkPhone(nextNational, nextCountry);
    onChange?.({ ...next, country: nextCountry, national: nextNational });
  }

  const showError = !check.ok && (touched || showErrors) && !disabled;
  // Hidden value: valid → normalized international digits; otherwise the raw combination, so the
  // server can return a precise error instead of "required".
  const hiddenValue = check.ok
    ? check.stored
    : national.trim()
      ? `${dial.slice(1)}${national.replace(/\D/g, "").replace(/^0/, "")}`
      : "";

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-2">
        <AdminSelect
          value={country}
          onChange={(v) => {
            if (isCountryCode(v)) update(v, national);
          }}
          options={options}
          layout="inline"
          disabled={disabled}
          aria-label="Country code"
          panelMinWidth={280}
          className="w-[6.75rem] shrink-0"
          renderValue={() => (
            <span className="font-medium text-zinc-900">
              {country} <span className="text-zinc-500">{dial}</span>
            </span>
          )}
        />
        <input
          ref={inputRef}
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onChange={(e) => update(country, e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={disabled}
          required={required}
          placeholder={placeholder ?? (country === "PK" ? "300 1234567" : "Phone number")}
          aria-label={ariaLabel}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? errorId : undefined}
          className={cn(inputInlineClass, "min-w-0 flex-1", showError && "ring-2 ring-red-300")}
        />
      </div>
      {name ? <input type="hidden" name={name} value={hiddenValue} /> : null}
      {showError ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-600">
          {check.message}
        </p>
      ) : null}
    </div>
  );
}

export { DEFAULT_PHONE_COUNTRY };
