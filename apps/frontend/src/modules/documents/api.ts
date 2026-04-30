import type {
  CreateDocumentRequest,
  Document,
  DocumentDetail,
  ListDocumentsResponse,
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
