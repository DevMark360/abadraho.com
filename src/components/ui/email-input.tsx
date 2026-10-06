"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { checkEmail } from "@/lib/email-check";
import { inputFieldClass, inputInlineClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

export type EmailInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value?: string;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  layout?: "field" | "inline";
  /** Show errors immediately (e.g. after a failed submit) instead of after the first blur. */
  showErrors?: boolean;
};

/**
 * Email field with live format validation and a one-click typo fix for common providers
 * ("ali@gmai.com" → "Did you mean ali@gmail.com?"). Invalid format blocks native submit via
 * setCustomValidity; the typo hint is only a suggestion (unusual real domains still pass).
 */
export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(function EmailInput(
  { value, defaultValue, onValueChange, layout = "inline", showErrors, className, required = true, onBlur, ...props },
  ref
) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = controlled ? value : inner;
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  useEffect(() => {
    if (!controlled && defaultValue != null) setInner(defaultValue);
  }, [controlled, defaultValue]);

  const check = useMemo(() => {
    if (!current.trim() && !required) return { ok: true as const, email: "" };
    return checkEmail(current);
  }, [current, required]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(check.ok ? "" : check.message);
  }, [check]);

  function set(next: string) {
    if (!controlled) setInner(next);
    onValueChange?.(next);
  }

  const visible = (touched || showErrors) && !props.disabled;
  const error = visible && !check.ok ? check.message : null;
  const suggestion = visible ? check.suggestion : undefined;
  const msgId = props.id ? `${props.id}-msg` : undefined;

  return (
    <>
      <input
        {...props}
        ref={inputRef}
        type="email"
        inputMode="email"
        autoComplete={props.autoComplete ?? "email"}
        required={required}
        value={current}
        onChange={(e) => set(e.target.value)}
        onBlur={(e) => {
          setTouched(true);
          onBlur?.(e);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || suggestion ? msgId : undefined}
        className={cn(
          layout === "field" ? inputFieldClass : inputInlineClass,
          error && "ring-2 ring-red-300",
          className
        )}
      />
      {error ? (
        <p id={msgId} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : null}
      {suggestion ? (
        <p id={error ? undefined : msgId} className="mt-1.5 text-xs text-amber-700">
          Did you mean{" "}
          <button
            type="button"
            onClick={() => set(suggestion)}
            className="font-semibold underline underline-offset-2 hover:text-amber-900"
          >
            {suggestion}
          </button>
          ?
        </p>
      ) : null}
    </>
  );
});
