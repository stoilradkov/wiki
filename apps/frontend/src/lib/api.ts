import axios from "axios";
import type { HealthResponse } from "@wiki/shared";

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

