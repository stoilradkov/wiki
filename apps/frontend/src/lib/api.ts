import axios from "axios";
import type { DomainEnums, HealthResponse, PublicAiSettings } from "@wiki/shared";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    Accept: "application/json"
  }
});

export async function getHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/health");

  return response.data;
}

export async function getAiSettings(): Promise<PublicAiSettings> {
  const response = await api.get<PublicAiSettings>("/settings/ai");

  return response.data;
}

export async function getDomainEnums(): Promise<DomainEnums> {
  const response = await api.get<DomainEnums>("/contracts/domain");

  return response.data;
}
