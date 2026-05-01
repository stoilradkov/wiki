import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/chat")({
  component: ChatView
});

function ChatView() {
  return <PlaceholderView title="Chat" />;
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <section className="content-panel">
      <div className="empty-state">
        <div>
          <Bot className="mx-auto size-10 text-faint" strokeWidth={1} />
  <h3 className="mt-4 font-serif text-display-sm italic text-muted-foreground">{title}</h3>
  <p className="mx-auto mt-2 max-w-xs text-ui font-light text-faint">
            This Phase 1 shell keeps the workspace route ready for the next phase.
          </p>
        </div>
      </div>
    </section>
  );
}
