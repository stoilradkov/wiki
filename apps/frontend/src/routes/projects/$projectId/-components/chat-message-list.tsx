import { Badge } from "@wiki/frontend/components/ui/badge";
import { Link } from "@tanstack/react-router";
import type { ChatMessage } from "@wiki/shared";
import { Bot, FileText, User } from "lucide-react";

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
              <p className="whitespace-pre-wrap text-ui leading-6">
                {message.content}
                {message.assistantStatus === "streaming" ? (
                  <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-accent align-middle" />
                ) : null}
              </p>
            ) : (
              <p className="text-ui text-muted-foreground">
                Waiting for answer stream
                {message.assistantStatus === "pending" || message.assistantStatus === "streaming" ? (
                  <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-accent align-middle" />
                ) : null}
              </p>
            )}
            {message.role === "assistant" && message.assistantStatus ? (
              <p className="mt-2 font-mono text-caption uppercase tracking-normal text-faint">
                {message.assistantStatus}
              </p>
            ) : null}
            {message.role === "assistant" && message.retrievedChunkReferences.length > 0 ? (
              <div className="mt-3 space-y-2 border-t-[0.5px] border-border pt-3">
                {message.retrievedChunkReferences.map((reference, index) => (
                  <Link
                    className="block rounded-md border-[0.5px] border-border bg-surface-2 p-2.5 text-ui text-muted-foreground hover:border-(--border-em) hover:text-foreground"
                    key={reference.chunkId}
                    params={{
                      documentId: reference.documentId,
                      projectId: reference.projectId
                    }}
                    to="/projects/$projectId/documents/$documentId"
                  >
                    <span className="flex items-center gap-2 text-caption font-medium text-foreground">
                      <FileText className="size-3.75 text-muted-foreground" strokeWidth={1.5} />
                      <span className="font-mono">C{index + 1}</span>
                      <span className="truncate">
                        {reference.documentTitle ?? "Untitled document"}
                      </span>
                    </span>
                    <span className="mt-1 block line-clamp-2 text-caption leading-relaxed">
                      {reference.snippet}
                    </span>
                  </Link>
                ))}
              </div>
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
