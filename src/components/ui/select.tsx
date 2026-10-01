import * as React from "react";
import { inputFieldClass, inputInlineClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  layout?: "field" | "inline";
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, layout = "inline", ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(layout === "field" ? inputFieldClass : inputInlineClass, className)}
        {...props}
      />
    );
  }
);
Select.displayName = "Select";
