import * as React from "react";
import { inputFieldClass, inputInlineClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** `field` — labeled form row (adds top margin). `inline` — toolbar / auth (default). */
  layout?: "field" | "inline";
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, layout = "inline", type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(layout === "field" ? inputFieldClass : inputInlineClass, className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
