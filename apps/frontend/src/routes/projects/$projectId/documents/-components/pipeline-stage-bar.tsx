export function PipelineStageBar({ stage }: { stage: string | null }) {
  const stages = ["markdownify", "chunk", "embed", "extract", "graph", "complete"] as const;
  const activeIndex = stage ? stages.findIndex((value) => value === stage) : -1;
  const stageLabel = activeIndex >= 0 ? `${stage} (stage ${activeIndex + 1} of 6)` : "queued";

  return (
    <div aria-label={`Pipeline: ${stageLabel}`} className="grid gap-1.5">
      <div className="stage-bar">
        {stages.map((value, index) => (
          <span
            className={`stage-pip ${
              activeIndex > index || stage === "complete"
                ? "stage-pip-complete"
                : activeIndex === index
                  ? "stage-pip-active"
                  : ""
            }`}
            key={value}
          />
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1 font-mono text-stage text-faint">
        {stages.map((value) => (
          <span className="truncate" key={value}>
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
