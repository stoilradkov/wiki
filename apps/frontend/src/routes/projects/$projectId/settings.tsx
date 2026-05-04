import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  extractionProfileSchema,
  extractionProfileValues,
  projectIngestionModeSchema,
  projectIngestionModeValues,
  type Project,
  type CreateProjectRequest
} from "@wiki/shared";
import { Button } from "@wiki/frontend/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@wiki/frontend/components/ui/form";
import { Input } from "@wiki/frontend/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@wiki/frontend/components/ui/select";
import { Textarea } from "@wiki/frontend/components/ui/textarea";
import {
  FormErrorBanner,
  LoadingLabel,
  PageError,
  SkeletonBlock,
  getErrorMessage
} from "@wiki/frontend/components/interaction";
import { listProjects, updateProject } from "@wiki/frontend/modules/projects/api";
import { projectQueryKeys } from "@wiki/frontend/modules/projects/query-keys";

export const Route = createFileRoute("/projects/$projectId/settings")({
  component: SettingsView
});

function SettingsView() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: projectQueryKeys.all, queryFn: listProjects });
  const project = projectsQuery.data?.find((candidate) => candidate.id === projectId);
  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: getProjectDefaults()
  });
  const updateProjectMutation = useMutation({
    mutationFn: (input: Partial<CreateProjectRequest>) => updateProject(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectQueryKeys.all })
  });

  useEffect(() => {
    if (project) settingsForm.reset(getProjectDefaults(project));
  }, [project, settingsForm]);

  function handleSettings(values: SettingsFormValues) {
    updateProjectMutation.mutate({
      color: values.color,
      customExtractionInstructions: optionalValue(values.customExtractionInstructions) ?? null,
      description: values.description,
      extractionProfile: values.extractionProfile,
      icon: values.icon,
      ingestionMode: values.ingestionMode,
      name: values.name
    });
  }

  if (projectsQuery.isLoading) {
    return (
      <section aria-busy="true" className="content-panel grid max-w-4xl gap-3">
        <SkeletonBlock className="h-6 w-44" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </section>
    );
  }

  if (projectsQuery.isError) {
    return (
      <section className="content-panel">
        <PageError
          message="Could not load project settings"
          onRetry={() => void projectsQuery.refetch()}
        />
      </section>
    );
  }

  if (!project) {
    return (
      <section className="content-panel">
        <div className="empty-state">
          <div>
            <h3 className="font-serif text-display-sm italic text-muted-foreground">
              This project no longer exists
            </h3>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content-panel grid max-w-4xl gap-6">
      <Form {...settingsForm}>
        <form className="grid gap-3" onSubmit={settingsForm.handleSubmit(handleSettings)}>
          <h3 className="section-title">Project settings</h3>
          <FormErrorBanner>
            {updateProjectMutation.isError
              ? getErrorMessage(updateProjectMutation.error, "Could not save settings. Try again.")
              : null}
          </FormErrorBanner>
          <div className="grid grid-cols-2 gap-3">
            {settingsTextFields.map((fieldConfig) => (
              <FormField
                control={settingsForm.control}
                key={fieldConfig.name}
                name={fieldConfig.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldConfig.label}</FormLabel>
                    <FormControl>
                      <Input className={fieldConfig.className} type={fieldConfig.type} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={settingsForm.control}
              name="ingestionMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingestion mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectIngestionModeValues.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={settingsForm.control}
              name="extractionProfile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extraction profile</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {extractionProfileValues.map((profile) => (
                        <SelectItem key={profile} value={profile}>
                          {profile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={settingsForm.control}
            name="customExtractionInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom extraction instructions</FormLabel>
                <FormControl>
                  <Textarea className="min-h-24 resize-y" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            aria-busy={updateProjectMutation.isPending}
            className="w-fit"
            disabled={updateProjectMutation.isPending}
            type="submit"
          >
            {updateProjectMutation.isPending ? (
              <LoadingLabel>Saving...</LoadingLabel>
            ) : (
              "Save settings"
            )}
          </Button>
        </form>
      </Form>
    </section>
  );
}

type SettingsFormValues = CreateProjectRequest & {
  color: string;
  customExtractionInstructions: string;
  description: string;
  icon: string;
  ingestionMode: NonNullable<CreateProjectRequest["ingestionMode"]>;
  name: string;
};

const settingsFormSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
  description: z.string().trim().max(1_000),
  color: z.string().trim().min(1).max(32),
  icon: z.string().trim().min(1).max(48),
  ingestionMode: projectIngestionModeSchema,
  extractionProfile: extractionProfileSchema,
  customExtractionInstructions: z.string().trim().max(4_000)
});

const settingsTextFields: Array<{
  className?: string;
  label: string;
  name: "name" | "color" | "icon" | "description";
  type?: string;
}> = [
  { label: "Project name", name: "name" },
  { className: "h-9.5 p-1", label: "Colour", name: "color", type: "color" },
  { label: "Icon", name: "icon" },
  { label: "Description", name: "description" }
];

function getProjectDefaults(project?: Project): SettingsFormValues {
  return {
    color: project?.color ?? "#C8F060",
    customExtractionInstructions: project?.customExtractionInstructions ?? "",
    description: project?.description ?? "",
    extractionProfile: project?.extractionProfile ?? "general",
    icon: project?.icon ?? "folder",
    ingestionMode: project?.ingestionMode ?? "inherit",
    name: project?.name ?? ""
  };
}

function optionalValue(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
}
