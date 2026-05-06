import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { SectionError, SkeletonBlock } from "@wiki/frontend/components/interaction";
import {
  createChatMessage,
  createChatThread,
  getChatThread,
  listChatThreads
} from "@wiki/frontend/modules/chat/api";
import { chatQueryKeys } from "@wiki/frontend/modules/chat/query-keys";
import { ChatComposer } from "@wiki/frontend/routes/projects/$projectId/-components/chat-composer";
import { ChatMessageList } from "@wiki/frontend/routes/projects/$projectId/-components/chat-message-list";
import { ChatScopeControl } from "@wiki/frontend/routes/projects/$projectId/-components/chat-scope-control";
import { ChatThreadList } from "@wiki/frontend/routes/projects/$projectId/-components/chat-thread-list";
import type { ChatScope, ChatThreadDetail, CreateChatMessageRequest } from "@wiki/shared";
import { MessageSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/projects/$projectId/chat")({
  component: ChatView
});

function ChatView() {
  const { projectId } = useParams({ from: "/projects/$projectId/chat" });
  const queryClient = useQueryClient();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [scope, setScope] = useState<ChatScope>({
    scope: "current_project",
    selectedProjectIds: []
  });
  const [composerResetVersion, setComposerResetVersion] = useState(0);
  const threadsQuery = useQuery({
    queryKey: chatQueryKeys.threads(projectId),
    queryFn: () => listChatThreads(projectId),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 2
  });
  const threadQuery = useQuery({
    queryKey: chatQueryKeys.thread(projectId, activeThreadId),
    queryFn: () => {
      if (!activeThreadId) throw new Error("Chat thread missing");
      return getChatThread(projectId, activeThreadId);
    },
    enabled: activeThreadId !== null,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 2
  });
  const activeThread = threadQuery.data;
  const visibleMessages = useMemo(() => activeThread?.messages ?? [], [activeThread]);
  const createThreadMutation = useMutation({
    mutationFn: () =>
      createChatThread(projectId, {
        defaultScope: scope
      }),
    onSuccess: (thread) => {
      setActiveThreadId(thread.id);
      setScope(thread.defaultScope);
      queryClient.setQueryData(chatQueryKeys.thread(projectId, thread.id), thread);
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.threads(projectId) });
    }
  });
  const createMessageMutation = useMutation({
    mutationFn: async (values: CreateChatMessageRequest) => {
      const thread = await ensureThread();
      return createChatMessage(projectId, thread.id, {
        ...values,
        scopeSnapshot: scope
      });
    },
    onSuccess: (response) => {
      setActiveThreadId(response.thread.id);
      setComposerResetVersion((currentVersion) => currentVersion + 1);
      queryClient.setQueryData(
        chatQueryKeys.thread(projectId, response.thread.id),
        response.thread
      );
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.threads(projectId) });
    }
  });

  useEffect(() => {
    const firstThread = threadsQuery.data?.[0];
    if (!activeThreadId && firstThread) {
      setActiveThreadId(firstThread.id);
    }
  }, [activeThreadId, threadsQuery.data]);

  useEffect(() => {
    if (activeThread) setScope(normalizeChatScope(activeThread.defaultScope));
  }, [activeThread]);

  async function ensureThread(): Promise<ChatThreadDetail> {
    if (activeThread) return activeThread;

    const thread = await createChatThread(projectId, {
      defaultScope: scope
    });
    setActiveThreadId(thread.id);
    queryClient.setQueryData(chatQueryKeys.thread(projectId, thread.id), thread);
    void queryClient.invalidateQueries({ queryKey: chatQueryKeys.threads(projectId) });
    return thread;
  }

  function handleCreateThread() {
    createThreadMutation.mutate();
  }

  function handleSubmitMessage(values: CreateChatMessageRequest) {
    createMessageMutation.mutate(values);
  }

  return (
    <section className="content-panel">
      <div className="grid min-h-160 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="border-b-[0.5px] border-border pb-4 lg:border-r-[0.5px] lg:border-b-0 lg:pr-4">
          {threadsQuery.isLoading ? (
            <div className="space-y-2">
              <SkeletonBlock className="h-8 w-full" />
              <SkeletonBlock className="h-16 w-full" />
              <SkeletonBlock className="h-16 w-full" />
            </div>
          ) : null}
          {threadsQuery.isError ? (
            <SectionError
              message="Could not load chat threads"
              onRetry={() => void threadsQuery.refetch()}
            />
          ) : null}
          {threadsQuery.data ? (
            <ChatThreadList
              activeThreadId={activeThreadId}
              isCreating={createThreadMutation.isPending}
              onCreateThread={handleCreateThread}
              onSelectThread={setActiveThreadId}
              threads={threadsQuery.data}
            />
          ) : null}
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-display-sm italic text-foreground">
                {activeThread?.title ?? "Chat"}
              </h2>
              {activeThread ? (
                <p className="mt-1 font-mono text-caption text-faint">
                  {new Date(activeThread.updatedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <ChatScopeControl onScopeChange={setScope} scope={scope} />
          </div>

          {threadQuery.isLoading ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-24 w-3/4" />
              <SkeletonBlock className="ml-auto h-24 w-2/3" />
            </div>
          ) : null}

          {threadQuery.isError ? (
            <SectionError
              message="Could not load chat history"
              onRetry={() => void threadQuery.refetch()}
            />
          ) : null}

          {!activeThreadId && !threadsQuery.isLoading ? (
            <div className="empty-state min-h-72">
              <div>
                <MessageSquare className="mx-auto size-10 text-faint" strokeWidth={1.5} />
                <h3 className="mt-4 font-serif text-display-sm italic text-muted-foreground">
                  No threads yet
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-ui font-light text-faint">
                  Send a first message to create a persisted investigation.
                </p>
              </div>
            </div>
          ) : null}

          {activeThreadId && !threadQuery.isLoading ? (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border-[0.5px] border-(--border-em) bg-surface-2 p-3.5">
              <ChatMessageList messages={visibleMessages} />
            </div>
          ) : null}

          <ChatComposer
            errorMessage={
              createMessageMutation.isError ? "Could not send message. Try again." : null
            }
            isSending={createMessageMutation.isPending}
            onSubmit={handleSubmitMessage}
            resetVersion={composerResetVersion}
          />
        </div>
      </div>
    </section>
  );
}

function normalizeChatScope(scope: ChatScope): ChatScope {
  if (scope.scope === "selected_projects") {
    return {
      scope: "current_project",
      selectedProjectIds: []
    };
  }

  return scope;
}
