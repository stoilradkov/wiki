import { useQuery } from "@tanstack/react-query";
import type { DocumentDetail } from "@wiki/shared";
import { SectionError, SkeletonBlock } from "@wiki/frontend/components/interaction";
import { listDocumentChunks } from "@wiki/frontend/modules/documents/api";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";
import { useEffect } from "react";

interface DocumentChunksPanelProps {
  document: DocumentDetail;
  projectId: string;
  targetChunkId?: string;
}

export function DocumentChunksPanel({
  document: sourceDocument,
  projectId,
  targetChunkId
}: DocumentChunksPanelProps) {
  const markdown = sourceDocument.currentMarkdownVersion?.markdown ?? "";
  const lineCount = markdown.length > 0 ? markdown.split("\n").length : 0;
  const characterCount = markdown.length;
  const markdownVersionId = sourceDocument.currentMarkdownVersionId;
  const chunksQuery = useQuery({
    queryKey: documentQueryKeys.chunks(projectId, sourceDocument.id, markdownVersionId),
    queryFn: () => listDocumentChunks(projectId, sourceDocument.id),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 2
  });

  useEffect(() => {
    if (!targetChunkId || chunksQuery.isLoading) return;

    const target = window.document.getElementById(`chunk-${targetChunkId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [chunksQuery.isLoading, targetChunkId]);

  return (
    <div className="grid gap-3">
      <div className="rounded-md border-[0.5px] border-border bg-surface-2 p-3.5">
        <h4 className="text-ui font-medium text-foreground">Chunks</h4>
        <p className="mt-1 text-ui text-muted-foreground">
          Current markdown chunks used by search, chat grounding, and citation links.
        </p>
      </div>
      <div className="grid gap-2 rounded-md border-[0.5px] border-border bg-surface-3 p-3.5 font-mono text-caption text-foreground">
        <span>documentId: {sourceDocument.id}</span>
        <span>projectId: {sourceDocument.projectId}</span>
        <span>status: {sourceDocument.status}</span>
        <span>stage: {sourceDocument.pipelineStage ?? "none"}</span>
        <span>markdownVersionId: {sourceDocument.currentMarkdownVersion?.id ?? "none"}</span>
        <span>markdownVersion: {sourceDocument.currentMarkdownVersion?.versionNumber ?? "none"}</span>
        <span>markdownHash: {sourceDocument.currentMarkdownVersion?.markdownHash ?? "none"}</span>
        <span>markdownCharacters: {characterCount}</span>
        <span>markdownLines: {lineCount}</span>
        <span>rawContentHash: {sourceDocument.rawContentHash}</span>
      </div>
      {chunksQuery.isLoading ? (
        <div className="grid gap-2">
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
      ) : null}
      {chunksQuery.isError ? (
        <SectionError
          message="Could not load chunks"
          onRetry={() => void chunksQuery.refetch()}
        />
      ) : null}
      {chunksQuery.data?.length === 0 ? (
        <div className="rounded-md border-[0.5px] border-border bg-surface-2 p-3.5 text-ui text-muted-foreground">
          No chunks available for current markdown version.
        </div>
      ) : null}
      {chunksQuery.data && chunksQuery.data.length > 0 ? (
        <div className="grid gap-2">
          {chunksQuery.data.map((chunk) => {
            const isTarget = chunk.id === targetChunkId;
            const heading =
              chunk.headingPath.length > 0
                ? chunk.headingPath.join(" / ")
                : `Chunk ${chunk.chunkIndex + 1}`;

            return (
              <article
                className={`rounded-md border-[0.5px] p-3.5 ${
                  isTarget
                    ? "border-accent bg-surface-1"
                    : "border-border bg-surface-2"
                }`}
                id={`chunk-${chunk.id}`}
                key={chunk.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h5 className="text-ui font-medium text-foreground">{heading}</h5>
                    <p className="mt-1 font-mono text-caption text-faint">
                      C{chunk.chunkIndex + 1} / offsets {chunk.markdownOffsets.start}-
                      {chunk.markdownOffsets.end} / tokens {chunk.tokenCount}
                    </p>
                  </div>
                  <span className="font-mono text-caption text-muted-foreground">
                    {chunk.embeddingModel ?? "not embedded"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-ui leading-6 text-muted-foreground">
                  {chunk.content}
                </p>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
