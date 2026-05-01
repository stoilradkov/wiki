import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@wiki/frontend/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-ui transition-[background-color,border-color,color,opacity,transform,box-shadow] duration-150 ease-in active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 aria-busy:opacity-70 [&_svg]:pointer-events-none [&_svg]:size-[15px] [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
  {
    variants: {
      variant: {
        default: "border-0 bg-primary font-medium text-primary-foreground hover:opacity-90",
        secondary:
          "border-[0.5px] border-border bg-transparent font-normal text-muted-foreground hover:border-[var(--border-em)] hover:text-foreground",
        ghost:
          "border-[0.5px] border-[var(--border-em)] bg-transparent font-normal text-muted-foreground hover:text-foreground",
        outline:
          "border-[0.5px] border-[var(--border-em)] bg-transparent font-normal text-muted-foreground hover:text-foreground",
        danger:
          "border-[0.5px] border-[rgba(240,112,96,0.25)] bg-[var(--coral-dim)] font-normal text-coral hover:border-coral/40"
      },
      size: {
        default: "h-[34px] px-4 py-2",
        sm: "h-[30px] px-3 py-1.5",
        icon: "size-[30px] rounded-sm p-1.5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };
