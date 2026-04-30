import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { BrainCircuit, ShieldCheck, TriangleAlert } from "lucide-react";
import type { FormEvent } from "react";
import {
  extractionProfileValues,
  ingestionModeValues,
  type CreateProjectRequest
} from "@wiki/shared";
import { Button } from "@wiki/frontend/components/ui/button";
import { listProjects, updateProject } from "@wiki/frontend/modules/projects/api";
import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";
import { getAiSettings } from "@wiki/frontend/modules/settings/api";
import { settingsQueryKeys } from "@wiki/frontend/modules/settings/query-keys";
import { getHealth } from "@wiki/frontend/modules/system/api";
import { systemQueryKeys } from "@wiki/frontend/modules/system/query-keys";

export const Route = createFileRoute("/projects/$projectId/settings")({
  component: SettingsView
});

function SettingsView() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: projectQueryKeys.all, queryFn: listProjects });
  const aiSettingsQuery = useQuery({
    queryKey: settingsQueryKeys.ai,
    queryFn: getAiSettings
  });
  const healthQuery = useQuery({ queryKey: systemQueryKeys.health, queryFn: getHealth });
  const project = projectsQuery.data?.find((candidate) => candidate.id === projectId);
  const updateProjectMutation = useMutation({
    mutationFn: (input: Partial<CreateProjectRequest>) => updateProject(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectQueryKeys.all })
  });

  function handleSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updateProjectMutation.mutate({
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      color: String(form.get("color") ?? "#1f6feb"),
      icon: String(form.get("icon") ?? "folder"),
      ingestionMode: String(
        form.get("ingestionMode") ?? "auto"
      ) as CreateProjectRequest["ingestionMode"],
      extractionProfile: String(
        form.get("extractionProfile") ?? "general"
      ) as CreateProjectRequest["extractionProfile"],
      customExtractionInstructions: optionalField(form, "customExtractionInstructions") ?? null
    });
  }

  if (!project) {
    return <section className="p-6 text-sm text-muted-foreground">Loading settings...</section>;
  }

  return (
    <section className="grid max-w-4xl gap-6 p-6">
      <form className="grid gap-3" onSubmit={handleSettings}>
        <h3 className="text-lg font-semibold">Project settings</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="rounded-md border bg-card px-3 py-2 text-sm"
            defaultValue={project.name}
            name="name"
            required
          />
          <input
            className="h-10 rounded-md border bg-card px-2"
            defaultValue={project.color}
            name="color"
            type="color"
          />
          <input
            className="rounded-md border bg-card px-3 py-2 text-sm"
            defaultValue={project.icon}
            name="icon"
          />
          <input
            className="rounded-md border bg-card px-3 py-2 text-sm"
            defaultValue={project.description}
            name="description"
          />
          <select
            className="rounded-md border bg-card px-3 py-2 text-sm"
            defaultValue={project.ingestionMode}
            name="ingestionMode"
          >
            {ingestionModeValues.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border bg-card px-3 py-2 text-sm"
            defaultValue={project.extractionProfile}
            name="extractionProfile"
          >
            {extractionProfileValues.map((profile) => (
              <option key={profile} value={profile}>
                {profile}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm"
          defaultValue={project.customExtractionInstructions ?? ""}
          name="customExtractionInstructions"
          placeholder="Custom extraction instructions"
        />
        <Button disabled={updateProjectMutation.isPending} type="submit">
          Save settings
        </Button>
      </form>
      <div className="grid gap-2 rounded-md border bg-card p-4 text-sm">
        <h3 className="flex items-center gap-2 font-semibold">
          <BrainCircuit className="size-4" /> AI configuration
        </h3>
        <p>
          Backend: {healthQuery.data ? `${healthQuery.data.service} online` : healthQuery.status}
        </p>
        <p>Provider: {aiSettingsQuery.data?.provider ?? aiSettingsQuery.status}</p>
        <p>Generation: {aiSettingsQuery.data?.generationModel ?? "loading"}</p>
        <p>
          Embedding:{" "}
          {aiSettingsQuery.data
            ? `${aiSettingsQuery.data.embeddingModel} (${aiSettingsQuery.data.embeddingDimension})`
            : "loading"}
        </p>
        <p className="flex items-center gap-2">
          {aiSettingsQuery.data?.secretStatus === "configured" ? (
            <ShieldCheck className="size-4" />
          ) : (
            <TriangleAlert className="size-4" />
          )}
          Gemini key: {aiSettingsQuery.data?.secretStatus ?? "loading"}
        </p>
      </div>
    </section>
  );
}

function optionalField(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  return value.length > 0 ? value : undefined;
}
