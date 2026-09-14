import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
  {
    variants: {
      variant: {
        default:
          "border border-line bg-panel text-cream hover:border-gold-soft",
        gold: "border border-gold bg-gold font-semibold text-ink hover:bg-gold-soft",
        ghost: "text-muted hover:text-cream",
        danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-[13px]",
        icon: "size-11",
        iconSm: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
