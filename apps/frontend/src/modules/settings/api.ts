import type { PublicAiSettings } from "@wiki/shared";
import { api } from "@wiki/frontend/lib/http";

export async function getAiSettings(): Promise<PublicAiSettings> {
  const response = await api.get<PublicAiSettings>("/settings/ai");
  return response.data;
}
