import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@wiki/backend/db/client";
import { chatMessages, chatThreads } from "@wiki/backend/db/schema";
import {
  chatMessageSchema,
  chatScopeSchema,
  chatThreadDetailSchema,
  chatThreadSchema,
  type ChatModelMetadata,
  type ChatMessage,
  type ChatRetrievedChunkReference,
  type ChatRetrievalMetadata,
  type ChatScope,
  type ChatThread,
  type ChatThreadDetail,
  type AssistantMessageStatus,
  type CreateChatMessageRequest,
  type CreateChatThreadRequest
} from "@wiki/shared";

const toIso = (value: Date) => value.toISOString();

function mapChatThread(row: typeof chatThreads.$inferSelect): ChatThread {
  return chatThreadSchema.parse({
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    defaultScope: row.defaultScope,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  });
}

function mapChatMessage(row: typeof chatMessages.$inferSelect): ChatMessage {
  return chatMessageSchema.parse({
    id: row.id,
    threadId: row.threadId,
    role: row.role,
    content: row.content,
    assistantStatus: row.assistantStatus ?? null,
    scopeSnapshot: row.scopeSnapshot ?? null,
    retrievedChunkReferences: row.retrievedChunkReferences,
    modelMetadata: row.modelMetadata ?? null,
    retrievalMetadata: row.retrievalMetadata ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  });
}

function makeThreadTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return "New investigation";
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

export type PendingChatExchange = {
  assistantMessageId: string;
  scopeSnapshot: ChatScope;
};

export async function listChatThreads(projectId: string): Promise<ChatThread[]> {
  const rows = await db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.projectId, projectId))
    .orderBy(desc(chatThreads.updatedAt));

  return rows.map(mapChatThread);
}

export async function createChatThread(
  projectId: string,
  input: CreateChatThreadRequest
): Promise<ChatThreadDetail> {
  const defaultScope = chatScopeSchema.parse(input.defaultScope);
  const [threadRow] = await db
    .insert(chatThreads)
    .values({
      projectId,
      title: input.title ?? "New investigation",
      defaultScope
    })
    .returning();

  if (!threadRow) {
    throw new Error("Chat thread insert returned no row");
  }

  return chatThreadDetailSchema.parse({
    ...mapChatThread(threadRow),
    messages: []
  });
}

export async function getChatThread(
  projectId: string,
  threadId: string
): Promise<ChatThreadDetail | null> {
  const [threadRow] = await db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.projectId, projectId)))
    .limit(1);

  if (!threadRow) return null;

  const messageRows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.createdAt));

  return chatThreadDetailSchema.parse({
    ...mapChatThread(threadRow),
    messages: messageRows.map(mapChatMessage)
  });
}

export async function createPendingChatExchange(
  projectId: string,
  thread: ChatThreadDetail,
  input: CreateChatMessageRequest
): Promise<PendingChatExchange> {
  const now = new Date();
  const scopeSnapshot: ChatScope = chatScopeSchema.parse(
    input.scopeSnapshot ?? thread.defaultScope
  );
  const title = thread.messages.length === 0 ? makeThreadTitle(input.content) : thread.title;
  const trimmedContent = input.content.trim();
  let assistantMessageId: string | null = null;

  await db.transaction(async (tx) => {
    const insertedMessages = await tx
      .insert(chatMessages)
      .values([
        {
          threadId: thread.id,
          role: "user",
          content: trimmedContent,
          scopeSnapshot
        },
        {
          threadId: thread.id,
          role: "assistant",
          content: "",
          assistantStatus: "pending",
          scopeSnapshot,
          retrievedChunkReferences: []
        }
      ])
      .returning();

    if (insertedMessages.length !== 2) {
      throw new Error("Chat message insert returned incomplete rows");
    }

    const assistantMessage = insertedMessages.find((message) => message.role === "assistant");
    if (!assistantMessage) {
      throw new Error("Chat assistant message insert returned no row");
    }

    assistantMessageId = assistantMessage.id;

    const [updatedThread] = await tx
      .update(chatThreads)
      .set({ title, updatedAt: now })
      .where(and(eq(chatThreads.id, thread.id), eq(chatThreads.projectId, projectId)))
      .returning();

    if (!updatedThread) {
      throw new Error("Chat thread update returned no row");
    }
  });

  if (!assistantMessageId) {
    throw new Error("Chat assistant message id missing after insert");
  }

  return {
    assistantMessageId,
    scopeSnapshot
  };
}

export async function completeAssistantMessage(
  messageId: string,
  input: {
    content: string;
    modelMetadata: ChatModelMetadata;
    references: ChatRetrievedChunkReference[];
    retrievalMetadata: ChatRetrievalMetadata;
  }
): Promise<ChatMessage> {
  return updateAssistantMessage(messageId, {
    ...input,
    status: "completed"
  });
}

export async function claimPendingAssistantMessageStream(
  messageId: string
): Promise<ChatMessage | null> {
  const [updated] = await db
    .update(chatMessages)
    .set({
      assistantStatus: "streaming",
      updatedAt: new Date()
    })
    .where(
      and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.role, "assistant"),
        eq(chatMessages.assistantStatus, "pending")
      )
    )
    .returning();

  return updated ? mapChatMessage(updated) : null;
}

export async function failAssistantMessage(
  messageId: string,
  input: {
    content: string;
    modelMetadata: ChatModelMetadata;
    references: ChatRetrievedChunkReference[];
    retrievalMetadata: ChatRetrievalMetadata;
  }
): Promise<ChatMessage> {
  return updateAssistantMessage(messageId, {
    ...input,
    status: "failed"
  });
}

async function updateAssistantMessage(
  messageId: string,
  input: {
    content: string;
    modelMetadata: ChatModelMetadata;
    references: ChatRetrievedChunkReference[];
    retrievalMetadata: ChatRetrievalMetadata;
    status: AssistantMessageStatus;
  }
): Promise<ChatMessage> {
  const [updated] = await db
    .update(chatMessages)
    .set({
      content: input.content,
      assistantStatus: input.status,
      retrievedChunkReferences: input.references,
      modelMetadata: input.modelMetadata,
      retrievalMetadata: input.retrievalMetadata,
      updatedAt: new Date()
    })
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.role, "assistant")))
    .returning();

  if (!updated) {
    throw new Error("Chat assistant message update returned no row");
  }

  return mapChatMessage(updated);
}
