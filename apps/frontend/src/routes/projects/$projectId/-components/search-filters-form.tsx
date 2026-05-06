import { Button } from "@wiki/frontend/components/ui/button";
import { Form } from "@wiki/frontend/components/ui/form";
import type { SearchFiltersFormValues } from "@wiki/frontend/modules/search/search-filters";
import { SearchAdvancedFilters } from "@wiki/frontend/routes/projects/$projectId/-components/search-advanced-filters";
import { SearchCommonFilters } from "@wiki/frontend/routes/projects/$projectId/-components/search-common-filters";
import { SearchProjectScopePicker } from "@wiki/frontend/routes/projects/$projectId/-components/search-project-scope-picker";
import type { Project } from "@wiki/shared";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

interface SearchFiltersFormProps {
  form: UseFormReturn<SearchFiltersFormValues>;
  isProjectsError: boolean;
  isProjectsLoading: boolean;
  isSearching: boolean;
  onProjectsRetry: () => void;
  onSubmit: (values: SearchFiltersFormValues) => void;
  onToggleProject: (projectId: string) => void;
  projects: Project[] | undefined;
  scope: SearchFiltersFormValues["scope"];
  selectedProjectIds: string[];
}

export function SearchFiltersForm({
  form,
  isProjectsError,
  isProjectsLoading,
  isSearching,
  onProjectsRetry,
  onSubmit,
  onToggleProject,
  projects,
  scope,
  selectedProjectIds
}: SearchFiltersFormProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <Form {...form}>
      <form className="card space-y-3.5 p-3.5" onSubmit={form.handleSubmit(onSubmit)}>
        <SearchCommonFilters form={form} isSearching={isSearching} />

        {scope === "selected_projects" ? (
          <SearchProjectScopePicker
            isError={isProjectsError}
            isLoading={isProjectsLoading}
            onRetry={onProjectsRetry}
            onToggleProject={onToggleProject}
            projects={projects}
            selectedProjectIds={selectedProjectIds}
          />
        ) : null}

        <div className="h-[0.5px] bg-border" />

        <Button
          aria-expanded={isAdvancedOpen}
          onClick={() => setIsAdvancedOpen((current) => !current)}
          type="button"
          variant="secondary"
        >
          <SlidersHorizontal strokeWidth={1.5} />
          Advanced filters
          <ChevronDown
            className={isAdvancedOpen ? "rotate-180 transition-transform" : "transition-transform"}
            strokeWidth={1.5}
          />
        </Button>

        {isAdvancedOpen ? <SearchAdvancedFilters form={form} /> : null}
      </form>
    </Form>
  );
}
