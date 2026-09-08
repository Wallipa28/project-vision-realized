import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-0 px-3 py-1 text-xs font-medium shadow-raised transition-colors focus:outline-none focus:ring-2 focus:ring-ring/25 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#6B4226]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#f6e5cf]",
        destructive:
          "bg-red-100 text-destructive shadow-none hover:bg-red-100 dark:bg-red-950 dark:text-red-200",
        outline: "bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
