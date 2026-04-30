import type { DomainEnums, HealthResponse } from "@wiki/shared";
import { api } from "@wiki/frontend/lib/http";

export async function getHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/health");
  return response.data;
}

export async function getDomainEnums(): Promise<DomainEnums> {
  const response = await api.get<DomainEnums>("/contracts/domain");
  return response.data;
}
