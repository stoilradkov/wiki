import { fullTextSearchRequestSchema, type DocumentStatus, type EntityType } from "@wiki/shared";
import type { SearchProjectRequest } from "@wiki/frontend/modules/search/api";

export type SearchLimitValue = "10" | "20" | "30" | "50";

export interface SearchFiltersFormValues {
  documentStatus: DocumentStatus | "any";
  entityNames: string;
  entityType: EntityType | "any";
  limit: SearchLimitValue;
  query: string;
  scope: SearchProjectRequest["scope"];
  selectedProjectIds: string[];
  sourceDateFrom: string;
  sourceDateTo: string;
  tags: string;
}

export const searchFormDefaults: SearchFiltersFormValues = {
  documentStatus: "any",
  entityNames: "",
  entityType: "any",
  limit: "20",
  query: "",
  scope: "current_project",
  selectedProjectIds: [],
  sourceDateFrom: "",
  sourceDateTo: "",
  tags: ""
};

export const scopedSearchRequestSchema = fullTextSearchRequestSchema.omit({ projectIds: true });

export function createSearchRequest(values: SearchFiltersFormValues): SearchProjectRequest {
  const documentStatuses = values.documentStatus === "any" ? [] : [values.documentStatus];
  const entityTypes = values.entityType === "any" ? [] : [values.entityType];

  return {
    query: values.query,
    scope: values.scope,
    selectedProjectIds: values.selectedProjectIds,
    includeArchivedProjects: false,
    includeDeletedDocuments: false,
    documentStatuses,
    sourceDateFrom: emptyToUndefined(values.sourceDateFrom),
    sourceDateTo: emptyToUndefined(values.sourceDateTo),
    tags: splitFilter(values.tags),
    entityNames: splitFilter(values.entityNames),
    entityTypes,
    limit: Number(values.limit)
  };
}

export function formatOption(value: string): string {
  return value
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function splitFilter(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function emptyToUndefined(value: string): string | undefined {
  return value.trim().length === 0 ? undefined : value;
}
