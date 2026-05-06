import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { SectionError, SkeletonBlock } from "@wiki/frontend/components/interaction";
import { listProjects } from "@wiki/frontend/modules/projects/api";
import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";
import { searchProject, type SearchProjectRequest } from "@wiki/frontend/modules/search/api";
import { groupResultsByDocument } from "@wiki/frontend/modules/search/group-results";
import { searchQueryKeys } from "@wiki/frontend/modules/search/query-keys";
import {
  createSearchRequest,
  scopedSearchRequestSchema,
  searchFormDefaults,
  type SearchFiltersFormValues
} from "@wiki/frontend/modules/search/search-filters";
import { SearchFiltersForm } from "@wiki/frontend/routes/projects/$projectId/-components/search-filters-form";
import { SearchResultGroup } from "@wiki/frontend/routes/projects/$projectId/-components/search-result-group";
import { Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { ZodIssue } from "zod";

export const Route = createFileRoute("/projects/$projectId/search")({
  component: SearchView
});

function SearchView() {
  const { projectId } = useParams({ from: "/projects/$projectId/search" });
  const [submittedFilters, setSubmittedFilters] = useState<SearchProjectRequest | null>(null);
  const searchForm = useForm<SearchFiltersFormValues>({
    defaultValues: searchFormDefaults
  });
  const scope = searchForm.watch("scope");
  const selectedProjectIds = searchForm.watch("selectedProjectIds");
  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.all,
    queryFn: listProjects,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 2
  });
  const searchQuery = useQuery({
    queryKey: searchQueryKeys.hybrid(projectId, submittedFilters),
    queryFn: () => {
      if (submittedFilters === null) {
        throw new Error("Search filters missing");
      }

      return searchProject(projectId, submittedFilters);
    },
    enabled: submittedFilters !== null,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 2
  });
  const groupedResults = useMemo(
    () => groupResultsByDocument(searchQuery.data?.results ?? []),
    [searchQuery.data]
  );

  function handleSubmit(values: SearchFiltersFormValues) {
    searchForm.clearErrors();
    const parsed = scopedSearchRequestSchema.safeParse(createSearchRequest(values));

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => setSearchFormError(issue));
      return;
    }

    setSubmittedFilters(parsed.data);
  }

  const toggleProject = useCallback(
    (projectToToggleId: string) => {
      const nextProjectIds = selectedProjectIds.includes(projectToToggleId)
        ? selectedProjectIds.filter((candidateId) => candidateId !== projectToToggleId)
        : [...selectedProjectIds, projectToToggleId];

      searchForm.setValue("selectedProjectIds", nextProjectIds);
    },
    [searchForm, selectedProjectIds]
  );

  function setSearchFormError(issue: ZodIssue): void {
    const message = issue.message;

    switch (issue.path[0]) {
      case "documentStatuses":
        searchForm.setError("documentStatus", { message });
        return;
      case "entityNames":
        searchForm.setError("entityNames", { message });
        return;
      case "entityTypes":
        searchForm.setError("entityType", { message });
        return;
      case "limit":
        searchForm.setError("limit", { message });
        return;
      case "query":
        searchForm.setError("query", { message });
        return;
      case "sourceDateFrom":
        searchForm.setError("sourceDateFrom", { message });
        return;
      case "sourceDateTo":
        searchForm.setError("sourceDateTo", { message });
        return;
      case "tags":
        searchForm.setError("tags", { message });
        return;
      default:
        searchForm.setError("query", { message: "Search filters need valid values" });
    }
  }

  return (
    <section className="content-panel space-y-5">
      <SearchFiltersForm
        form={searchForm}
        isProjectsError={projectsQuery.isError}
        isProjectsLoading={projectsQuery.isLoading}
        isSearching={searchQuery.isFetching}
        onProjectsRetry={() => void projectsQuery.refetch()}
        onSubmit={handleSubmit}
        onToggleProject={toggleProject}
        projects={projectsQuery.data}
        scope={scope}
        selectedProjectIds={selectedProjectIds}
      />

      {searchQuery.isLoading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-36 w-full" />
        </div>
      ) : null}

      {searchQuery.isError ? (
        <SectionError message="Could not run search" onRetry={() => void searchQuery.refetch()} />
      ) : null}

      {!submittedFilters ? (
        <div className="empty-state">
          <div>
            <Search className="mx-auto size-10 text-faint" strokeWidth={1.5} />
            <h3 className="mt-4 font-serif text-display-sm italic text-muted-foreground">
              Search chunks
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-ui font-light text-faint">
              Hybrid search uses exact matches and embeddings across chosen project scope.
            </p>
          </div>
        </div>
      ) : null}

      {submittedFilters && searchQuery.data && groupedResults.length === 0 ? (
        <div className="empty-state">
          <div>
            <Search className="mx-auto size-10 text-faint" strokeWidth={1.5} />
            <h3 className="mt-4 font-serif text-display-sm italic text-muted-foreground">
              No chunks found
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-ui font-light text-faint">
              Ready chunks in selected scope did not match those filters.
            </p>
          </div>
        </div>
      ) : null}

      {groupedResults.map((group) => (
        <SearchResultGroup group={group} key={group.document.id} projectId={projectId} />
      ))}
    </section>
  );
}
