import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Clay: raised buttons press "into" the surface on click (inset shadow + no lift).
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl [&_svg]:shrink-0 text-sm font-semibold transition-[background-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-clay-canvas active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-zinc-700 to-zinc-900 text-brand-foreground shadow-clay-btn hover:-translate-y-px hover:from-zinc-600 hover:to-zinc-900 active:shadow-clay-pressed",
        accent:
          "bg-gradient-to-b from-[#f5464d] to-brand-accent text-brand-accent-foreground shadow-clay-btn-accent hover:-translate-y-px hover:from-[#f75a60] hover:to-brand-accent-hover active:shadow-clay-pressed",
        secondary:
          "bg-clay-well text-zinc-900 shadow-clay-sm hover:bg-clay-surface active:shadow-clay-inset",
        ghost: "text-zinc-700 hover:bg-clay-well",
        outline:
          "border border-white/80 bg-clay-surface text-zinc-800 shadow-clay-sm hover:-translate-y-px hover:shadow-clay active:shadow-clay-inset",
      },
      size: {
        default: "h-11 min-h-[44px] px-5 py-2",
        sm: "h-9 min-h-[44px] rounded-xl px-3.5 text-sm md:text-xs",
        lg: "h-12 min-h-[44px] px-7 text-base",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
