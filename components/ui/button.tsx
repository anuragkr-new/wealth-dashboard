import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "gradient-bg text-accent-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-accent-lg hover:brightness-110",
        secondary:
          "border border-border bg-muted text-foreground hover:border-accent/30 hover:bg-muted/80 hover:shadow-md",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted hover:shadow-md",
        ghost:
          "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        destructive:
          "bg-destructive text-white shadow-sm hover:-translate-y-0.5 hover:brightness-110",
      },
      size: {
        default: "h-12 px-5 py-2",
        sm: "h-10 rounded-lg px-4 text-sm",
        lg: "h-14 rounded-xl px-8 text-base",
        icon: "h-12 w-12",
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
