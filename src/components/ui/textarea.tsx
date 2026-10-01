import * as React from "react";
import { inputFieldClass, inputInlineClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  layout?: "field" | "inline";
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, layout = "inline", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          layout === "field" ? inputFieldClass : inputInlineClass,
          "min-h-[5rem] resize-y",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
