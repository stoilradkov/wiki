import { Link } from "@tanstack/react-router";
import type { DocumentResultGroup } from "@wiki/frontend/modules/search/group-results";
import { FileText } from "lucide-react";

interface SearchResultGroupProps {
  group: DocumentResultGroup;
  projectId: string;
}

export function SearchResultGroup({ group, projectId }: SearchResultGroupProps) {
  return (
    <article className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b-[0.5px] border-border p-3.5">
        <div className="min-w-0">
          <Link
            className="flex items-center gap-2 text-card-title font-medium text-foreground"
            params={{ documentId: group.document.id, projectId }}
            to="/projects/$projectId/documents/$documentId"
          >
            <FileText className="size-3.75 text-muted-foreground" strokeWidth={1.5} />
            <span className="truncate">{group.document.title ?? "Untitled document"}</span>
          </Link>
          <div className="mt-1 flex flex-wrap gap-2 text-caption text-muted-foreground">
            <span>{group.project.name}</span>
            {group.document.sourceMetadata.author ? (
              <span>{group.document.sourceMetadata.author}</span>
            ) : null}
            {group.document.sourceMetadata.sourceDate ? (
              <span>{group.document.sourceMetadata.sourceDate}</span>
            ) : null}
          </div>
        </div>
        <span className="meta">{group.results.length} chunks</span>
      </div>
      <div className="divide-y-[0.5px] divide-border">
        {group.results.map((result) => (
          <div className="p-3.5" key={result.chunk.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 truncate text-caption text-muted-foreground">
                {result.chunk.headingPath.length > 0
                  ? result.chunk.headingPath.join(" / ")
                  : `Chunk ${result.chunk.chunkIndex + 1}`}
              </div>
              <div className="meta shrink-0">
                RRF {result.rank.toFixed(4)} | FTS {result.matchRanks.fullText ?? "-"} | SEM{" "}
                {result.matchRanks.semantic ?? "-"}
              </div>
            </div>
            <p
              className="markdown-preview mt-2 text-ui text-muted-foreground [&_mark]:rounded-sm [&_mark]:bg-amber-dim [&_mark]:px-0.5 [&_mark]:text-amber"
              dangerouslySetInnerHTML={{ __html: result.highlights.chunk }}
            />
          </div>
        ))}
      </div>
    </article>
  );
}
