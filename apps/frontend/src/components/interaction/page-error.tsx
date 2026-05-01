import type { ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@wiki/frontend/components/ui/button";

export function PageError({
  message,
  onRetry,
  backAction
}: {
  message: string;
  onRetry: () => void;
  backAction?: ReactNode;
}) {
  return (
    <div className="page-error" role="alert">
      <AlertCircle className="mx-auto size-8 text-coral" strokeWidth={1.5} />
      <h3>Something went wrong</h3>
      <p>{message}</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button onClick={onRetry} variant="ghost">
          <RotateCcw className="size-3.25" />
          Try again
        </Button>
        {backAction}
      </div>
    </div>
  );
}
