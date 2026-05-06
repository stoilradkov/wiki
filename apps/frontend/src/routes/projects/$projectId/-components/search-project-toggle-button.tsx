import { Button } from "@wiki/frontend/components/ui/button";
import type { Project } from "@wiki/shared";
import { useCallback } from "react";

interface SearchProjectToggleButtonProps {
  isSelected: boolean;
  onToggleProject: (projectId: string) => void;
  project: Project;
}

export function SearchProjectToggleButton({
  isSelected,
  onToggleProject,
  project
}: SearchProjectToggleButtonProps) {
  const handleClick = useCallback(() => {
    onToggleProject(project.id);
  }, [onToggleProject, project.id]);

  return (
    <Button
      aria-pressed={isSelected}
      className={isSelected ? "border-accent/40 bg-[var(--accent-dim)] text-accent" : undefined}
      onClick={handleClick}
      type="button"
      variant="ghost"
    >
      {project.name}
    </Button>
  );
}
