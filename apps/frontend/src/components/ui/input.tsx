import * as React from "react";
import { cn } from "@wiki/frontend/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input className={cn("input", className)} type={type} {...props} />;
}
