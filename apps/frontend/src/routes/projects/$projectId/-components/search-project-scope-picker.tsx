import { SectionError } from "@wiki/frontend/components/interaction";
import { SearchProjectToggleButton } from "@wiki/frontend/routes/projects/$projectId/-components/search-project-toggle-button";
import type { Project } from "@wiki/shared";

interface SearchProjectScopePickerProps {
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  onToggleProject: (projectId: string) => void;
  projects: Project[] | undefined;
  selectedProjectIds: string[];
}

export function SearchProjectScopePicker({
  isError,
  isLoading,
  onRetry,
  onToggleProject,
  projects,
  selectedProjectIds
}: SearchProjectScopePickerProps) {
  const selectedProjects = projects?.filter((project) => selectedProjectIds.includes(project.id)) ?? [];

  if (isError) {
    return (
      <SectionError message="Could not load projects for search scope" onRetry={onRetry} />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-caption text-muted-foreground">Projects</p>
      <div className="flex flex-wrap gap-2">
        {projects?.map((project) => (
          <SearchProjectToggleButton
            isSelected={selectedProjectIds.includes(project.id)}
            key={project.id}
            onToggleProject={onToggleProject}
            project={project}
          />
        ))}
        {isLoading ? <span className="text-caption text-muted-foreground">Loading projects</span> : null}
      </div>
      {selectedProjects.length === 0 && !isLoading ? (
        <p className="text-caption text-faint">No selected project means no results.</p>
      ) : null}
    </div>
  );
}
