import { Skeleton } from "@wiki/frontend/components/ui/skeleton";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <Skeleton className={className} />;
}
