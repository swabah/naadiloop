import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary px-5 py-3 text-white shadow-[0_10px_24px_-12px_rgba(37,99,235,.9)] hover:-translate-y-0.5 hover:bg-[#1d55d8]",
        secondary: "bg-primary-soft px-5 py-3 text-primary hover:bg-[#dce6ff]",
        outline:
          "border border-border bg-white px-5 py-3 text-primary-ink shadow-sm hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary-soft/45",
        ghost: "px-4 py-2 text-muted hover:bg-primary-soft/60 hover:text-primary-ink",
        gate: "bg-gate px-5 py-3 text-white shadow-sm hover:-translate-y-0.5 hover:bg-gate/90",
      },
      size: {
        default: "h-12",
        sm: "h-10 rounded-xl px-4 py-2 text-xs",
        icon: "size-12 p-0",
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
