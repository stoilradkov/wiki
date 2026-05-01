import * as React from "react";
import { cn } from "@wiki/frontend/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn("input", className)} {...props} />;
}
