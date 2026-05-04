import type {
  CheckDuplicateDocumentRequest,
  CreateDocumentRequest,
  Document,
  DocumentActionResponse,
  DocumentDetail,
  DuplicateDocumentResponse,
  ListDocumentsResponse,
  ListMarkdownVersionsResponse,
  MarkdownVersion,
  UpdateDocumentMarkdownRequest,
  UpdateDocumentMetadataRequest
} from "@wiki/shared";
import { api } from "@wiki/frontend/lib/http";

export async function listDocuments(projectId: string): Promise<Document[]> {
  const response = await api.get<ListDocumentsResponse>(`/projects/${projectId}/documents`);
  return response.data.documents;
}

export async function createDocument(
  projectId: string,
  input: CreateDocumentRequest
): Promise<DocumentDetail> {
  const response = await api.post<DocumentDetail>(`/projects/${projectId}/documents`, input);
  return response.data;
}

export async function checkDuplicateDocument(
  projectId: string,
  input: CheckDuplicateDocumentRequest
): Promise<DuplicateDocumentResponse> {
  const response = await api.post<DuplicateDocumentResponse>(
    `/projects/${projectId}/documents/duplicates/check`,
    input
  );
  return response.data;
}

export async function getDocument(projectId: string, documentId: string): Promise<DocumentDetail> {
  const response = await api.get<DocumentDetail>(`/projects/${projectId}/documents/${documentId}`);
  return response.data;
}

export async function listMarkdownVersions(
  projectId: string,
  documentId: string
): Promise<MarkdownVersion[]> {
  const response = await api.get<ListMarkdownVersionsResponse>(
    `/projects/${projectId}/documents/${documentId}/markdown/versions`
  );
  return response.data.versions;
}

export async function updateDocumentMetadata(
  projectId: string,
  documentId: string,
  input: UpdateDocumentMetadataRequest
): Promise<DocumentDetail> {
  const response = await api.patch<DocumentDetail>(
    `/projects/${projectId}/documents/${documentId}`,
    input
  );
  return response.data;
}

export async function updateDocumentMarkdown(
  projectId: string,
  documentId: string,
  input: UpdateDocumentMarkdownRequest
): Promise<DocumentDetail> {
  const response = await api.put<DocumentDetail>(
    `/projects/${projectId}/documents/${documentId}/markdown`,
    input
  );
  return response.data;
}

export async function approveDocumentReview(
  projectId: string,
  documentId: string
): Promise<DocumentDetail> {
  const response = await api.post<DocumentActionResponse>(
    `/projects/${projectId}/documents/${documentId}/review/approve`
  );
  return response.data.document;
}

export async function rerunDocumentMarkdownify(
  projectId: string,
  documentId: string
): Promise<DocumentDetail> {
  const response = await api.post<DocumentActionResponse>(
    `/projects/${projectId}/documents/${documentId}/markdown/rerun`
  );
  return response.data.document;
}
