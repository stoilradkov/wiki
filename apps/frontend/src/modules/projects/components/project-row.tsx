import { Link } from "@tanstack/react-router";
import { Archive, Circle } from "lucide-react";
import type { Project } from "@wiki/shared";

export function ProjectRow({ project }: { project: Project }) {
  return (
    <Link
      className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-md border bg-card p-4 hover:border-primary"
      params={{ projectId: project.id }}
      to="/projects/$projectId/documents"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Circle className="size-3 fill-current" style={{ color: project.color }} />
          <h3 className="truncate font-semibold">{project.name}</h3>
          {project.archived ? <Archive className="size-4 text-muted-foreground" /> : null}
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {project.description || "No description"}
        </p>
      </div>
      <span className="text-xs uppercase text-muted-foreground">{project.extractionProfile}</span>
    </Link>
  );
}
