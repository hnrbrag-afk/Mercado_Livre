import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-line bg-panel px-3 text-sm text-cream placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-md border border-line bg-panel px-3 py-2.5 text-sm text-cream placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
        className,
      )}
      {...props}
    />
  );
}

export function NativeSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 rounded-md border border-line bg-panel px-3 text-sm text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
