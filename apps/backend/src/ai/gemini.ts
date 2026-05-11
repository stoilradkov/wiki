export function normalizeGeminiModelName(modelName: string): string {
  return modelName.startsWith("models/") ? modelName.slice("models/".length) : modelName;
}
