import { Link } from "@tanstack/react-router";
import { Archive, Circle } from "lucide-react";
import type { Project } from "@wiki/shared";
import { Separator } from "@wiki/frontend/components/ui/separator";

export function ProjectRow({ project }: { project: Project }) {
  return (
    <Link
      className="card grid grid-cols-[1fr_auto] items-center gap-4 p-3.5"
      params={{ projectId: project.id }}
      to="/projects/$projectId/documents"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Circle className="size-1.75 fill-current" style={{ color: project.color }} />
          <h3 className="truncate text-card-title font-medium leading-tight text-foreground">
            {project.name}
          </h3>
          {project.archived ? <Archive className="size-3.25 text-muted-foreground" /> : null}
        </div>
        <p className="mt-2 line-clamp-2 text-ui leading-relaxed text-muted-foreground">
          {project.description || "No description"}
        </p>
        <Separator className="my-3" />
        <div className="flex items-center gap-2">
          <span className="tag">
            {project.ingestionMode === "inherit" ? "inherits global" : project.ingestionMode}
          </span>
          <span className="tag">{project.extractionProfile}</span>
        </div>
      </div>
      <span className="meta">{project.archived ? "archived" : "active"}</span>
    </Link>
  );
}
