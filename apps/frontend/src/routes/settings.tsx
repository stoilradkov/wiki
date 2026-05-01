import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BrainCircuit, ShieldCheck, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ingestionModeSchema,
  ingestionModeValues,
  type UpdateAppSettingsRequest
} from "@wiki/shared";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@wiki/frontend/components/ui/form";
import { Button } from "@wiki/frontend/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@wiki/frontend/components/ui/select";
import {
  FormErrorBanner,
  LoadingLabel,
  SectionError,
  SkeletonBlock,
  getErrorMessage
} from "@wiki/frontend/components/interaction";
import {
  getAiSettings,
  getAppSettings,
  updateAppSettings
} from "@wiki/frontend/modules/settings/api";
import { settingsQueryKeys } from "@wiki/frontend/modules/settings/query-keys";
import { getHealth } from "@wiki/frontend/modules/system/api";
import { systemQueryKeys } from "@wiki/frontend/modules/system/query-keys";

export const Route = createFileRoute("/settings")({
  component: GlobalSettingsPage
});

function GlobalSettingsPage() {
  const queryClient = useQueryClient();
  const appSettingsQuery = useQuery({
    queryKey: settingsQueryKeys.app,
    queryFn: getAppSettings
  });
  const aiSettingsQuery = useQuery({
    queryKey: settingsQueryKeys.ai,
    queryFn: getAiSettings
  });
  const healthQuery = useQuery({ queryKey: systemQueryKeys.health, queryFn: getHealth });
  const settingsForm = useForm<GlobalSettingsFormValues>({
    resolver: zodResolver(globalSettingsFormSchema),
    defaultValues: {
      defaultIngestionMode: "auto"
    }
  });
  const updateSettingsMutation = useMutation({
    mutationFn: (input: UpdateAppSettingsRequest) => updateAppSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.app });
    }
  });

  useEffect(() => {
    if (appSettingsQuery.data) {
      settingsForm.reset({
        defaultIngestionMode: appSettingsQuery.data.defaultIngestionMode
      });
    }
  }, [appSettingsQuery.data, settingsForm]);

  function handleSettings(values: GlobalSettingsFormValues) {
    updateSettingsMutation.mutate(values);
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <header className="topbar flex items-center justify-between">
        <div>
          <h2 className="page-title">Global settings</h2>
          <p className="mt-1 text-ui text-muted-foreground">
            Durable app defaults and backend AI configuration.
          </p>
        </div>
        <SlidersHorizontal className="size-4 text-muted-foreground" />
      </header>
      <section className="content-panel grid max-w-4xl gap-6">
        <Form {...settingsForm}>
          <form
            className="card grid gap-3 p-4"
            onSubmit={settingsForm.handleSubmit(handleSettings)}
          >
            <h3 className="section-title">App defaults</h3>
            <FormErrorBanner>
              {updateSettingsMutation.isError
                ? getErrorMessage(
                    updateSettingsMutation.error,
                    "Could not save global settings. Try again."
                  )
                : null}
            </FormErrorBanner>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 max-[900px]:grid-cols-1">
              <FormField
                control={settingsForm.control}
                name="defaultIngestionMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default ingestion mode</FormLabel>
                    <Select
                      disabled={appSettingsQuery.isLoading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ingestionModeValues.map((mode) => (
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
              <Button
                aria-busy={updateSettingsMutation.isPending}
                disabled={updateSettingsMutation.isPending || appSettingsQuery.isLoading}
                type="submit"
              >
                {updateSettingsMutation.isPending ? <LoadingLabel>Saving...</LoadingLabel> : "Save"}
              </Button>
            </div>
            {appSettingsQuery.isError ? (
              <SectionError
                message="Could not load global settings"
                onRetry={() => void appSettingsQuery.refetch()}
              />
            ) : null}
          </form>
        </Form>
        <div className="card grid gap-2 p-4 text-ui">
          <h3 className="section-title flex items-center gap-2">
            <BrainCircuit className="size-3.75 text-purple" /> AI configuration
          </h3>
          {healthQuery.isLoading || aiSettingsQuery.isLoading ? (
            <div aria-busy="true" className="grid gap-2">
              <SkeletonBlock className="h-3 w-52" />
              <SkeletonBlock className="h-3 w-40" />
              <SkeletonBlock className="h-3 w-64" />
            </div>
          ) : null}
          {healthQuery.isError ? (
            <SectionError
              message="Could not load backend status"
              onRetry={() => void healthQuery.refetch()}
            />
          ) : null}
          {aiSettingsQuery.isError ? (
            <SectionError
              message="Could not load AI configuration"
              onRetry={() => void aiSettingsQuery.refetch()}
            />
          ) : null}
          {healthQuery.data ? (
            <p className="meta">Backend: {healthQuery.data.service} online</p>
          ) : null}
          {aiSettingsQuery.data ? (
            <>
              <p className="meta">Provider: {aiSettingsQuery.data.provider}</p>
              <p className="meta">Generation: {aiSettingsQuery.data.generationModel}</p>
              <p className="meta">
                Embedding: {aiSettingsQuery.data.embeddingModel} (
                {aiSettingsQuery.data.embeddingDimension})
              </p>
              <p className="meta flex items-center gap-2">
                {aiSettingsQuery.data.secretStatus === "configured" ? (
                  <ShieldCheck className="size-3.25 text-primary" />
                ) : (
                  <TriangleAlert className="size-3.25 text-amber" />
                )}
                Gemini key: {aiSettingsQuery.data.secretStatus}
              </p>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

type GlobalSettingsFormValues = Pick<UpdateAppSettingsRequest, "defaultIngestionMode"> & {
  defaultIngestionMode: NonNullable<UpdateAppSettingsRequest["defaultIngestionMode"]>;
};

const globalSettingsFormSchema = z.object({
  defaultIngestionMode: ingestionModeSchema
});
