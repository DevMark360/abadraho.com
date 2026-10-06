"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { inputInlineClass } from "@/lib/form-styles";
import { PASSWORD_MAX_LENGTH, PASSWORD_RULES, passwordProblem } from "@/lib/password-policy";
import { cn } from "@/lib/utils";

/**
 * New-password field with a show/hide toggle and a live rules checklist (1 column on phones,
 * 2 from sm). Blocks native form submit until every rule passes.
 */
export function PasswordField({
  name,
  placeholder = "Password",
  autoComplete = "new-password",
}: {
  name: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const problem = passwordProblem(value);

  useEffect(() => {
    ref.current?.setCustomValidity(problem ?? "");
  }, [problem]);

  return (
    <div>
      <div className="relative">
        <input
          ref={ref}
          name={name}
          type={visible ? "text" : "password"}
          required
          maxLength={PASSWORD_MAX_LENGTH}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-describedby={`${name}-rules`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setActive(true)}
          className={cn(inputInlineClass, "pr-11")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 hover:text-zinc-700"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {/* Shown once the user starts on the field, so the form stays compact until then. */}
      <ul
        id={`${name}-rules`}
        className={cn("mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2", !active && !value && "sr-only")}
      >
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li
              key={rule.id}
              className={cn("flex items-center gap-1.5 text-xs", ok ? "text-emerald-700" : "text-zinc-500")}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <Circle className="h-3 w-3 shrink-0" aria-hidden />
              )}
              <span>{rule.label}</span>
              <span className="sr-only">{ok ? "(done)" : "(missing)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
