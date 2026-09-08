import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed active:translate-y-px active:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-0 bg-primary text-primary-foreground shadow-raised hover:bg-[#6B4226]",
        destructive:
          "border-0 bg-destructive text-destructive-foreground shadow-raised hover:bg-red-600",
        outline: "border-0 bg-secondary text-primary shadow-raised hover:bg-[#f6e5cf]",
        secondary:
          "border-0 bg-secondary text-secondary-foreground shadow-raised hover:bg-[#f6e5cf]",
        ghost: "border-0 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[42px] px-[18px] py-2",
        sm: "h-[34px] rounded-md px-[14px] text-xs",
        lg: "h-[50px] rounded-md px-6 text-base",
        icon: "h-[42px] w-[42px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
