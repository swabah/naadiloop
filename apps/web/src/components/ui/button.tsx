import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary px-5 py-3 text-white shadow-sm hover:bg-primary-ink",
        secondary: "bg-primary-soft px-5 py-3 text-primary-ink hover:bg-primary/15",
        outline: "border border-border bg-surface px-5 py-3 text-text hover:border-primary/35",
        ghost: "px-4 py-2 text-muted hover:bg-black/5 hover:text-text",
        gate: "bg-gate px-5 py-3 text-white hover:bg-gate/90",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-4 py-2 text-xs",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
