import { SkeletonBlock } from "@wiki/frontend/components/interaction/skeleton-block";
import { Separator } from "@wiki/frontend/components/ui/separator";

export function ProjectGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" className="grid grid-cols-2 gap-3 max-[1200px]:grid-cols-1">
      {Array.from({ length: count }).map((_, index) => (
        <div className="card grid gap-3 p-3.5" key={index}>
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-4 w-1/2" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
          <SkeletonBlock className="h-3 w-[88%]" />
          <SkeletonBlock className="h-3 w-[54%]" />
        <Separator />
          <SkeletonBlock className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}
