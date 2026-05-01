import { Badge, type BadgeProps } from "@wiki/frontend/components/ui/badge";

export function DocumentStatusBadge({ status }: { status: string }) {
  return (
    <Badge dot variant={getStatusVariant(status)}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

function getStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "ready") return "ready";
  if (status === "processing" || status === "needs_reprocess" || status === "dirty") {
    return "processing";
  }
  if (status === "awaiting_review") return "review";
  if (status === "failed") return "failed";
  return "queued";
}
