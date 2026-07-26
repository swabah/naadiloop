import type * as React from "react";
import { cn } from "../../lib/utils";

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium text-primary-ink outline-none transition placeholder:font-normal placeholder:text-muted/65 hover:border-slate-300 focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
