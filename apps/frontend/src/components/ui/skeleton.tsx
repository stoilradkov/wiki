import { cn } from "@wiki/frontend/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("skeleton", className)} {...props} />;
}
