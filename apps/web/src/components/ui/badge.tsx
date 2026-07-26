import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[0.7rem] font-bold tracking-[0.04em]",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary-ink",
        outline: "border border-border bg-white/90 text-muted",
        gate: "bg-gate/10 text-gate",
        warning: "bg-warning/10 text-warning",
        success: "bg-success/10 text-success-ink",
        info: "bg-primary-soft text-primary-ink",
        neutral: "border border-border bg-slate-50 text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
