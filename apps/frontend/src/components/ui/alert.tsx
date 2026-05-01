import * as React from "react";
import { cn } from "@wiki/frontend/lib/utils";

export function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
    "rounded-md border-[0.5px] border-border bg-surface-2 px-3 py-2 text-ui",
        className
      )}
      role="alert"
      {...props}
    />
  );
}
