import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  chatCompletedEventSchema,
  chatErrorEventSchema,
  chatTokenEventSchema,
  type ChatMessage,
  type ChatThreadDetail
} from "@wiki/shared";
import { chatQueryKeys } from "@wiki/frontend/modules/chat/query-keys";

export type ActiveChatStream = {
  threadId: string;
  streamId: string;
};

export function useChatMessageStream(
  projectId: string,
  activeStream: ActiveChatStream | null,
  onTerminal: () => void
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!activeStream) return;

    const source = new EventSource(
      `/api/projects/${projectId}/chat/threads/${activeStream.threadId}/streams/${activeStream.streamId}`
    );

    source.addEventListener("chat_token", (event) => {
      const parsed = parseMessageEvent(event, chatTokenEventSchema);
      if (!parsed || parsed.projectId !== projectId || parsed.threadId !== activeStream.threadId) {
        return;
      }

      queryClient.setQueryData<ChatThreadDetail>(
        chatQueryKeys.thread(projectId, activeStream.threadId),
        (thread) =>
          updateThreadMessage(thread, parsed.messageId, (message) => ({
            ...message,
            assistantStatus: "streaming",
            content: `${message.content}${parsed.delta}`
          }))
      );
    });

    source.addEventListener("chat_completed", (event) => {
      const parsed = parseMessageEvent(event, chatCompletedEventSchema);
      if (!parsed || parsed.projectId !== projectId || parsed.threadId !== activeStream.threadId) {
        return;
      }

      const message = parsed.message;
      if (message) {
        queryClient.setQueryData<ChatThreadDetail>(
          chatQueryKeys.thread(projectId, activeStream.threadId),
          (thread) => replaceThreadMessage(thread, message)
        );
      }
      source.close();
      onTerminal();
    });

    source.addEventListener("chat_error", (event) => {
      const parsed = parseMessageEvent(event, chatErrorEventSchema);
      if (!parsed || parsed.projectId !== projectId || parsed.threadId !== activeStream.threadId) {
        return;
      }

      const message = parsed.message;
      if (message) {
        queryClient.setQueryData<ChatThreadDetail>(
          chatQueryKeys.thread(projectId, activeStream.threadId),
          (thread) => replaceThreadMessage(thread, message)
        );
      }
      source.close();
      onTerminal();
    });

    source.onerror = () => {
      source.close();
      onTerminal();
    };

    return () => {
      source.close();
    };
  }, [activeStream, onTerminal, projectId, queryClient]);
}

function updateThreadMessage(
  thread: ChatThreadDetail | undefined,
  messageId: string,
  update: (message: ChatMessage) => ChatMessage
): ChatThreadDetail | undefined {
  if (!thread) return thread;

  return {
    ...thread,
    messages: thread.messages.map((message) =>
      message.id === messageId ? update(message) : message
    )
  };
}

function replaceThreadMessage(
  thread: ChatThreadDetail | undefined,
  updatedMessage: ChatMessage
): ChatThreadDetail | undefined {
  return updateThreadMessage(thread, updatedMessage.id, () => updatedMessage);
}

function parseMessageEvent<T>(
  event: Event,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }
): T | null {
  if (!(event instanceof MessageEvent)) return null;

  try {
    const payload: unknown = JSON.parse(event.data);
    const parsed = schema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
