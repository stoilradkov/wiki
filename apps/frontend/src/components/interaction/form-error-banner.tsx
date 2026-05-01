import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Alert } from "@wiki/frontend/components/ui/alert";

export function FormErrorBanner({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <Alert className="form-error-banner">
      <AlertCircle className="size-3.25" />
      <span>{children}</span>
    </Alert>
  );
}
