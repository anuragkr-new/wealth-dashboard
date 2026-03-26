import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent gradient-bg text-accent-foreground shadow-sm",
        secondary:
          "border-border bg-muted text-foreground",
        success:
          "border-success/30 bg-success/10 text-success",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
        trend: "border-accent/40 bg-accent/10 font-mono text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
