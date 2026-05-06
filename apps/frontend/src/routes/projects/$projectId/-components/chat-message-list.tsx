import { Badge } from "@wiki/frontend/components/ui/badge";
import type { ChatMessage } from "@wiki/shared";
import { Bot, User } from "lucide-react";

interface ChatMessageListProps {
  messages: ChatMessage[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="empty-state min-h-72">
        <div>
          <Bot className="mx-auto size-10 text-faint" strokeWidth={1.5} />
          <h3 className="mt-4 font-serif text-display-sm italic text-muted-foreground">
            Start investigation
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-ui font-light text-faint">
            Ask a question and this thread will keep its messages here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {messages.map((message) => (
        <div
          className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          key={message.id}
        >
          {message.role === "assistant" ? (
            <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md border-[0.5px] border-(--border-em) bg-surface-2 text-muted-foreground">
              <Bot className="size-3.5" strokeWidth={1.5} />
            </div>
          ) : null}
          <div
            className={`max-w-2xl rounded-md border-[0.5px] px-3.5 py-3 ${
              message.role === "user"
                ? "border-accent bg-primary text-primary-foreground"
                : "border-(--border-em) bg-surface-1 text-foreground"
            }`}
          >
            {message.content ? (
              <p className="whitespace-pre-wrap text-ui leading-6">{message.content}</p>
            ) : (
              <p className="text-ui text-muted-foreground">Waiting for answer stream</p>
            )}
            {message.role === "assistant" && message.assistantStatus ? (
              <p className="mt-2 font-mono text-caption uppercase tracking-normal text-faint">
                {message.assistantStatus}
              </p>
            ) : null}
            {message.role === "assistant" ? (
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-caption text-faint">
                {message.scopeSnapshot ? (
                  <Badge className="font-mono" variant="queued">
                    scope {formatScope(message.scopeSnapshot)}
                  </Badge>
                ) : null}
                <Badge className="font-mono" variant="queued">
                  chunks {message.retrievedChunkReferences.length}
                </Badge>
                {message.modelMetadata ? (
                  <Badge className="font-mono" variant="queued">
                    model {message.modelMetadata.generationModel}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
          {message.role === "user" ? (
            <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md border-[0.5px] border-accent bg-primary text-primary-foreground">
              <User className="size-3.5" strokeWidth={1.5} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function formatScope(scope: ChatMessage["scopeSnapshot"]): string {
  if (!scope) return "unknown";
  if (scope.scope === "current_project") return "current project";
  if (scope.scope === "all_projects") return "all projects";
  return `${scope.selectedProjectIds.length} selected`;
}
