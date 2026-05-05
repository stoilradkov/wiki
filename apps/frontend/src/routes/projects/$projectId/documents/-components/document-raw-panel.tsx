import type { DocumentDetail } from "@wiki/shared";

interface DocumentRawPanelProps {
  document: DocumentDetail;
}

export function DocumentRawPanel({ document }: DocumentRawPanelProps) {
  const sourceLabel = document.sourceMetadata.title ?? document.sourceMetadata.url ?? "No source";

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5 text-caption text-muted-foreground">
        <span>{sourceLabel}</span>
        <span>{document.sourceMetadata.author ?? "No author"}</span>
        <span className="meta">{document.rawContentHash}</span>
      </div>
      <h4 className="text-ui font-medium text-foreground">Raw text</h4>
      {document.rawContentStored && document.rawContent ? (
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border-[0.5px] border-border bg-surface-3 p-3.5 font-mono text-caption leading-relaxed text-foreground">
          {document.rawContent}
        </pre>
      ) : (
        <div className="rounded-md border-[0.5px] border-amber bg-(--amber-dim) p-3.5 text-ui text-foreground">
          Raw source was deleted. Canonical markdown and stored hash remain available.
        </div>
      )}
    </div>
  );
}
