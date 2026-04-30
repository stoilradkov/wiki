import { useEffect, useState } from "react";
import { BrainCircuit, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import {
  createAppInfo,
  domainEnums,
  packageName,
  type DomainEnums,
  type PublicAiSettings
} from "@wiki/shared";
import { Button } from "@wiki/frontend/components/ui/button";
import { getAiSettings, getDomainEnums, getHealth } from "@wiki/frontend/lib/api";

const appInfo = createAppInfo();
const backendHealthRetryDelays = [500, 1_000, 2_000, 4_000];

export function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const [aiSettings, setAiSettings] = useState<PublicAiSettings | null>(null);
  const [aiSettingsStatus, setAiSettingsStatus] = useState("loading");
  const [backendDomainEnums, setBackendDomainEnums] = useState<DomainEnums | null>(null);
  const [domainEnumsStatus, setDomainEnumsStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | undefined;

    async function checkBackend(attempt = 0) {
      if (mounted) {
        setIsCheckingBackend(true);
      }

      try {
        const health = await getHealth();
        if (mounted) {
          setBackendStatus(`${health.service} online`);
          setIsCheckingBackend(false);
        }
      } catch {
        const retryDelay = backendHealthRetryDelays[attempt];

        if (mounted && retryDelay !== undefined) {
          timeoutId = window.setTimeout(() => {
            void checkBackend(attempt + 1);
          }, retryDelay);
          return;
        }

        if (mounted) {
          setBackendStatus("unavailable");
          setIsCheckingBackend(false);
        }
      }
    }

    void checkBackend();

    getAiSettings()
      .then((settings) => {
        if (mounted) {
          setAiSettings(settings);
          setAiSettingsStatus("loaded");
        }
      })
      .catch(() => {
        if (mounted) {
          setAiSettingsStatus("unavailable");
        }
      });

    getDomainEnums()
      .then((contracts) => {
        if (mounted) {
          setBackendDomainEnums(contracts);
          setDomainEnumsStatus("loaded");
        }
      })
      .catch(() => {
        if (mounted) {
          setDomainEnumsStatus("unavailable");
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section className="w-full max-w-180 rounded-lg border bg-card p-8 text-card-foreground shadow-[0_12px_30px_rgb(15_23_42/8%)]">
        <p className="mb-2.5 text-xs font-bold uppercase text-muted-foreground">{packageName}</p>
        <h1 className="mb-3.5 text-4xl font-semibold leading-none">Workspace bootstrap ready</h1>
        <p className="text-base leading-7 text-muted-foreground">
          Frontend and backend packages can both import shared TypeScript contracts from{" "}
          <code className="rounded-sm bg-muted px-1.5 py-0.5 text-foreground">@wiki/shared</code>
        </p>
        <dl className="mt-7 grid gap-3">
          <div className="flex justify-between gap-4 border-t pt-3">
            <dt className="font-semibold text-muted-foreground">Shared contract version</dt>
            <dd className="font-mono">{appInfo.version}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3">
            <dt className="font-semibold text-muted-foreground">Package boundary</dt>
            <dd className="font-mono">frontend UI</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <dt className="font-semibold text-muted-foreground">Backend API</dt>
            <dd className="flex items-center gap-2 font-mono">
              <span>{backendStatus}</span>
              <Button
                aria-label="Check backend health"
                disabled={isCheckingBackend}
                onClick={() => {
                  setBackendStatus("checking");
                  setIsCheckingBackend(true);
                  void getHealth()
                    .then((health) => {
                      setBackendStatus(`${health.service} online`);
                    })
                    .catch(() => {
                      setBackendStatus("unavailable");
                    })
                    .finally(() => {
                      setIsCheckingBackend(false);
                    });
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <RefreshCw className={isCheckingBackend ? "animate-spin" : ""} />
              </Button>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <dt className="flex items-center gap-2 font-semibold text-muted-foreground">
              <BrainCircuit className="size-4" />
              AI provider
            </dt>
            <dd className="font-mono">
              {aiSettings
                ? `${aiSettings.provider} / ${aiSettings.generationModel}`
                : aiSettingsStatus}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <dt className="font-semibold text-muted-foreground">Embedding model</dt>
            <dd className="font-mono">
              {aiSettings
                ? `${aiSettings.embeddingModel} (${aiSettings.embeddingDimension})`
                : aiSettingsStatus}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <dt className="font-semibold text-muted-foreground">Worker limits</dt>
            <dd className="font-mono">
              {aiSettings
                ? `${aiSettings.workerConcurrency} worker / ${aiSettings.workerRetryCount} retries`
                : aiSettingsStatus}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <dt className="font-semibold text-muted-foreground">Gemini key</dt>
            <dd className="flex items-center gap-2 font-mono">
              {aiSettings?.secretStatus === "configured" ? (
                <ShieldCheck className="size-4 text-accent-foreground" />
              ) : (
                <TriangleAlert className="size-4 text-muted-foreground" />
              )}
              <span>{aiSettings?.secretStatus ?? aiSettingsStatus}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <dt className="font-semibold text-muted-foreground">Domain enums</dt>
            <dd className="font-mono">
              {backendDomainEnums
                ? `${backendDomainEnums.documentStatuses.length} statuses / ${backendDomainEnums.pipelineStages.length} stages`
                : domainEnumsStatus}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <dt className="font-semibold text-muted-foreground">Graph contract</dt>
            <dd className="font-mono">
              {domainEnums.entityTypes.length} entity types / {domainEnums.predicates.length}{" "}
              predicates
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
