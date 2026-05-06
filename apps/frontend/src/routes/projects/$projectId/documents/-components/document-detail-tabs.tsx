import type { DocumentDetail } from "@wiki/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@wiki/frontend/components/ui/tabs";
import { DocumentChunksPanel } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-chunks-panel";
import { DocumentDerivedPlaceholder } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-derived-placeholder";
import { DocumentMarkdownPanel } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-markdown-panel";
import { DocumentRawPanel } from "@wiki/frontend/routes/projects/$projectId/documents/-components/document-raw-panel";

interface DocumentDetailTabsProps {
  citationChunkId?: string;
  document: DocumentDetail;
  projectId: string;
}

const tabItems = ["markdown", "raw", "summary", "entities", "chunks"] as const;

export function DocumentDetailTabs({ citationChunkId, document, projectId }: DocumentDetailTabsProps) {
  return (
    <Tabs className="gap-3" defaultValue={citationChunkId ? "chunks" : "markdown"}>
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
        <DocumentRawPanel document={document} />
      </TabsContent>
      <TabsContent value="summary">
        <DocumentDerivedPlaceholder document={document} label="Summary" />
      </TabsContent>
      <TabsContent value="entities">
        <DocumentDerivedPlaceholder document={document} label="Entities" />
      </TabsContent>
      <TabsContent value="chunks">
        <DocumentChunksPanel
          document={document}
          projectId={projectId}
          targetChunkId={citationChunkId}
        />
      </TabsContent>
    </Tabs>
  );
}
