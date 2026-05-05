import type { DocumentDetail } from "@wiki/shared";

interface DocumentChunksPanelProps {
  document: DocumentDetail;
}

export function DocumentChunksPanel({ document }: DocumentChunksPanelProps) {
  const markdown = document.currentMarkdownVersion?.markdown ?? "";
  const lineCount = markdown.length > 0 ? markdown.split("\n").length : 0;
  const characterCount = markdown.length;

  return (
    <div className="grid gap-3">
      <div className="rounded-md border-[0.5px] border-border bg-surface-2 p-3.5">
        <h4 className="text-ui font-medium text-foreground">Chunk debug metadata</h4>
        <p className="mt-1 text-ui text-muted-foreground">
          Persisted chunks arrive in Phase 3. Current version metadata is shown here for citation and
          indexing diagnostics.
        </p>
      </div>
      <div className="grid gap-2 rounded-md border-[0.5px] border-border bg-surface-3 p-3.5 font-mono text-caption text-foreground">
        <span>documentId: {document.id}</span>
        <span>projectId: {document.projectId}</span>
        <span>status: {document.status}</span>
        <span>stage: {document.pipelineStage ?? "none"}</span>
        <span>markdownVersionId: {document.currentMarkdownVersion?.id ?? "none"}</span>
        <span>markdownVersion: {document.currentMarkdownVersion?.versionNumber ?? "none"}</span>
        <span>markdownHash: {document.currentMarkdownVersion?.markdownHash ?? "none"}</span>
        <span>markdownCharacters: {characterCount}</span>
        <span>markdownLines: {lineCount}</span>
        <span>rawContentHash: {document.rawContentHash}</span>
      </div>
    </div>
  );
}
