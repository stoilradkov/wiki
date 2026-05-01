import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export function LoadingLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <LoaderCircle className="size-3.25 animate-spin" />
      {children}
    </>
  );
}
