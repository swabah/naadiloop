import type * as React from "react";
import { cn } from "../../lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-32 w-full resize-y rounded-2xl border border-border bg-[#f9faff] px-4 py-3.5 text-sm font-medium leading-6 text-primary-ink outline-none transition placeholder:font-normal placeholder:text-muted/65 hover:border-slate-300 focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
