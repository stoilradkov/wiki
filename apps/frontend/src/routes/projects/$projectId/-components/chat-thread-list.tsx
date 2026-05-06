import { Button } from "@wiki/frontend/components/ui/button";
import type { ChatThread } from "@wiki/shared";
import { MessageSquarePlus } from "lucide-react";

interface ChatThreadListProps {
  activeThreadId: string | null;
  isCreating: boolean;
  onCreateThread: () => void;
  onSelectThread: (threadId: string) => void;
  threads: ChatThread[];
}

export function ChatThreadList({
  activeThreadId,
  isCreating,
  onCreateThread,
  onSelectThread,
  threads
}: ChatThreadListProps) {
  return (
    <aside className="space-y-3.5">
      <Button
        aria-busy={isCreating}
        className="w-full"
        disabled={isCreating}
        onClick={onCreateThread}
        type="button"
        variant="ghost"
      >
        <MessageSquarePlus strokeWidth={1.5} />
        {isCreating ? "Creating" : "New thread"}
      </Button>
      <div className="space-y-2">
        {threads.map((thread) => (
          <button
            className={`w-full rounded-md border-[0.5px] px-3 py-2 text-left transition-colors ${
              activeThreadId === thread.id
                ? "border-accent bg-surface-2"
                : "border-(--border-em) bg-surface-1 hover:bg-surface-2"
            }`}
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            type="button"
          >
            <span className="block truncate text-ui font-medium text-foreground">
              {thread.title}
            </span>
            <span className="mt-1 block font-mono text-caption text-faint">
              {new Date(thread.updatedAt).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
