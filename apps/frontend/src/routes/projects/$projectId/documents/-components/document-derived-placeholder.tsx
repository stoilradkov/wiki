import type { DocumentDetail } from "@wiki/shared";

interface DocumentDerivedPlaceholderProps {
  document: DocumentDetail;
  label: "Summary" | "Entities";
}

export function DocumentDerivedPlaceholder({ document, label }: DocumentDerivedPlaceholderProps) {
  const ready = document.status === "ready";
  const waitingText = ready
    ? `${label} output is not available yet. This phase keeps the tab ready for derived data.`
    : `${label} output will appear after ingestion reaches extraction.`;

  return (
    <div className="grid gap-3 rounded-md border-[0.5px] border-border bg-surface-2 p-3.5">
      <div>
        <h4 className="text-ui font-medium text-foreground">{label}</h4>
        <p className="text-ui text-muted-foreground">{waitingText}</p>
      </div>
      <div className="grid gap-1.5 font-mono text-caption text-faint">
        <span>status: {document.status}</span>
        <span>stage: {document.pipelineStage ?? "none"}</span>
        <span>markdownVersion: {document.currentMarkdownVersion?.versionNumber ?? "none"}</span>
      </div>
    </div>
  );
}
