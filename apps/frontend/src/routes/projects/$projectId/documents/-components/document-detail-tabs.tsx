import type { DocumentDetail } from "@wiki/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@wiki/frontend/components/ui/tabs";
import { DocumentMarkdownPanel } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-markdown-panel";

interface DocumentDetailTabsProps {
  document: DocumentDetail;
  projectId: string;
}

const tabItems = ["markdown", "raw", "summary", "entities", "chunks"] as const;

export function DocumentDetailTabs({ document, projectId }: DocumentDetailTabsProps) {
  return (
    <Tabs className="gap-3" defaultValue="markdown">
      <TabsList
        aria-label="Document sections"
        className="flex h-auto flex-wrap gap-1 border-[0.5px] border-border"
      >
        {tabItems.map((item) => (
          <TabsTrigger className="capitalize" key={item} value={item}>
            {item}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="markdown">
        <DocumentMarkdownPanel document={document} projectId={projectId} />
      </TabsContent>
      <TabsContent value="raw">
        <div className="grid gap-3">
          <div className="grid gap-2 text-caption text-muted-foreground">
            <span>{document.sourceMetadata.title ?? "No source title"}</span>
            <span>{document.sourceMetadata.author ?? "No author"}</span>
            <span className="meta">{document.rawContentHash}</span>
          </div>
          <h4 className="text-ui font-medium text-foreground">Raw text</h4>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border-[0.5px] border-border bg-surface-3 p-3.5 font-mono text-caption leading-relaxed text-foreground">
            {document.rawContent ?? "Raw content is not stored for this document."}
          </pre>
        </div>
      </TabsContent>
      <TabsContent value="summary">
        <div className="rounded-md border-[0.5px] border-border bg-surface-2 p-3.5 text-ui text-muted-foreground">
          Summary will appear after extraction runs.
        </div>
      </TabsContent>
      <TabsContent value="entities">
        <div className="rounded-md border-[0.5px] border-border bg-surface-2 p-3.5 text-ui text-muted-foreground">
          Entities will appear after extraction runs.
        </div>
      </TabsContent>
      <TabsContent value="chunks">
        <div className="rounded-md border-[0.5px] border-border bg-surface-2 p-3.5 text-ui text-muted-foreground">
          Chunks will appear after indexing runs.
        </div>
      </TabsContent>
    </Tabs>
  );
}
