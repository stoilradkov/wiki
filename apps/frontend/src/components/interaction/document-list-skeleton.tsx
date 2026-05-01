import { SkeletonBlock } from "@wiki/frontend/components/interaction/skeleton-block";

export function DocumentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div aria-busy="true" className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div className="card grid gap-3 p-3.5" key={index}>
          <div className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-4 w-1/3" />
            <SkeletonBlock className="h-5 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="h-3 w-[86%]" />
          <SkeletonBlock className="h-3 w-[44%]" />
          <SkeletonBlock className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
