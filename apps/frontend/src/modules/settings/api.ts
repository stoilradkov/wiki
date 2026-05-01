import type { AppSettings, PublicAiSettings, UpdateAppSettingsRequest } from "@wiki/shared";
import { api } from "@wiki/frontend/lib/http";

export async function getAppSettings(): Promise<AppSettings> {
  const response = await api.get<AppSettings>("/settings");
  return response.data;
}

export async function updateAppSettings(input: UpdateAppSettingsRequest): Promise<AppSettings> {
  const response = await api.patch<AppSettings>("/settings", input);
  return response.data;
}

export async function getAiSettings(): Promise<PublicAiSettings> {
  const response = await api.get<PublicAiSettings>("/settings/ai");
  return response.data;
}
