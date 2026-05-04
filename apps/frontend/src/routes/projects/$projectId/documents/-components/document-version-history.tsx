import { useQuery } from "@tanstack/react-query";
import { FileClock } from "lucide-react";
import { useMemo, useState } from "react";
import type { DocumentDetail, MarkdownVersion } from "@wiki/shared";
import { SectionError } from "@wiki/frontend/components/interaction";
import { Label } from "@wiki/frontend/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@wiki/frontend/components/ui/select";
import { listMarkdownVersions } from "@wiki/frontend/modules/documents/api";
import { documentQueryKeys } from "@wiki/frontend/modules/documents/query-keys";

interface DocumentVersionHistoryProps {
  document: DocumentDetail;
  projectId: string;
}

function formatVersionLabel(version: MarkdownVersion, currentMarkdownVersionId: string | null) {
  const current = version.id === currentMarkdownVersionId ? "Current" : "Previous";
  return `v${version.versionNumber} / ${version.author} / ${current}`;
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

export function DocumentVersionHistory({ document, projectId }: DocumentVersionHistoryProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const versionsQuery = useQuery({
    queryKey: documentQueryKeys.versions(projectId, document.id),
    queryFn: () => listMarkdownVersions(projectId, document.id),
    staleTime: 30_000
  });
  const versions = versionsQuery.data ?? [];
  const selectedVersion = useMemo(() => {
    const activeVersionId =
      selectedVersionId ?? document.currentMarkdownVersionId ?? versions[0]?.id ?? null;
    return versions.find((version) => version.id === activeVersionId) ?? versions[0] ?? null;
  }, [document.currentMarkdownVersionId, selectedVersionId, versions]);

  if (versionsQuery.isLoading) {
    return (
      <div className="rounded-md border-[0.5px] border-border bg-surface-2 p-3.5 text-ui text-muted-foreground">
        Loading versions...
      </div>
    );
  }

  if (versionsQuery.isError) {
    return (
      <SectionError
        message="Could not load markdown versions"
        onRetry={() => void versionsQuery.refetch()}
      />
    );
  }

  if (!selectedVersion) {
    return (
      <div className="rounded-md border-[0.5px] border-border bg-surface-2 p-3.5 text-ui text-muted-foreground">
        No markdown versions yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-md border-[0.5px] border-border bg-surface-2 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileClock className="size-3.75 text-muted-foreground" />
          <div>
            <h4 className="text-ui font-medium text-foreground">Version history</h4>
            <p className="meta">{versions.length} preserved versions</p>
          </div>
        </div>
        <div className="grid min-w-56 gap-1.5">
          <Label htmlFor="markdown-version-select">Inspect version</Label>
          <Select
            onValueChange={(value) => setSelectedVersionId(value)}
            value={selectedVersion.id}
          >
            <SelectTrigger id="markdown-version-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {formatVersionLabel(version, document.currentMarkdownVersionId)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5 text-caption text-muted-foreground">
        <span className="meta">{formatTimestamp(selectedVersion.createdAt)}</span>
        <span className="meta break-all">{selectedVersion.markdownHash}</span>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border-[0.5px] border-border bg-surface-3 p-3.5 font-mono text-caption leading-relaxed text-foreground">
        {selectedVersion.markdown}
      </pre>
    </div>
  );
}
