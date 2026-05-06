import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { SectionError, SkeletonBlock } from "@wiki/frontend/components/interaction";
import { Button } from "@wiki/frontend/components/ui/button";
import { Input } from "@wiki/frontend/components/ui/input";
import { searchProject } from "@wiki/frontend/modules/search/api";
import { groupResultsByDocument } from "@wiki/frontend/modules/search/group-results";
import { searchQueryKeys } from "@wiki/frontend/modules/search/query-keys";
import { SearchResultGroup } from "@wiki/frontend/routes/projects/$projectId/-components/search-result-group";
import { Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

export const Route = createFileRoute("/projects/$projectId/search")({
  component: SearchView
});

function SearchView() {
  const { projectId } = useParams({ from: "/projects/$projectId/search" });
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const searchQuery = useQuery({
    queryKey: searchQueryKeys.hybrid(projectId, submittedQuery),
    queryFn: () => searchProject(projectId, submittedQuery),
    enabled: submittedQuery.length > 0,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 2
  });
  const groupedResults = useMemo(
    () => groupResultsByDocument(searchQuery.data?.results ?? []),
    [searchQuery.data]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = draftQuery.trim();
    if (nextQuery.length === 0) return;
    setSubmittedQuery(nextQuery);
  }

  return (
    <section className="content-panel space-y-5">
      <form className="card flex items-end gap-3 p-3.5" onSubmit={handleSubmit}>
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-caption text-muted-foreground" htmlFor="search-query">
            Search current project
          </label>
          <Input
            id="search-query"
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Find exact terms and related meaning"
            value={draftQuery}
          />
        </div>
        <Button disabled={searchQuery.isFetching} type="submit">
          <Search className="size-3.75" strokeWidth={1.5} />
          {searchQuery.isFetching ? "Searching" : "Search"}
        </Button>
      </form>

      {searchQuery.isLoading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-36 w-full" />
        </div>
      ) : null}

      {searchQuery.isError ? (
        <SectionError message="Could not run search" onRetry={() => void searchQuery.refetch()} />
      ) : null}

      {!submittedQuery ? (
        <div className="empty-state">
          <div>
            <Search className="mx-auto size-10 text-faint" strokeWidth={1.5} />
            <h3 className="mt-4 font-serif text-display-sm italic text-muted-foreground">
              Search chunks
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-ui font-light text-faint">
              Hybrid search uses exact matches and embeddings inside this project.
            </p>
          </div>
        </div>
      ) : null}

      {submittedQuery && searchQuery.data && groupedResults.length === 0 ? (
        <div className="empty-state">
          <div>
            <Search className="mx-auto size-10 text-faint" strokeWidth={1.5} />
            <h3 className="mt-4 font-serif text-display-sm italic text-muted-foreground">
              No chunks found
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-ui font-light text-faint">
              Ready documents in this project did not match that query.
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
