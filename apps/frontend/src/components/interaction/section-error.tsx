import { AlertCircle } from "lucide-react";
import { Button } from "@wiki/frontend/components/ui/button";

export function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="section-error" role="alert">
      <AlertCircle className="size-3.75 text-coral" />
      <span>{message}</span>
      <Button onClick={onRetry} size="sm" type="button" variant="ghost">
        Retry
      </Button>
    </div>
  );
}
