import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@wiki/frontend/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full px-2.5 py-0.75 text-badge font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        queued: "bg-[rgba(255,255,255,0.06)] text-muted-foreground",
        ready: "bg-[var(--accent-dim)] text-primary",
        processing: "bg-[var(--amber-dim)] text-amber",
        review: "bg-[var(--blue-dim)] text-blue",
        failed: "bg-[var(--coral-dim)] text-coral"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, dot = false, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
