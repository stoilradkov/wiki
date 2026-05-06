import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@wiki/backend/db/client";
import { chatMessages, chatThreads } from "@wiki/backend/db/schema";
import {
  chatMessageSchema,
  chatScopeSchema,
  chatThreadDetailSchema,
  chatThreadSchema,
  type ChatMessage,
  type ChatScope,
  type ChatThread,
  type ChatThreadDetail,
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
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  });
}

function makeThreadTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return "New investigation";
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

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

export async function createChatMessage(
  projectId: string,
  threadId: string,
  input: CreateChatMessageRequest
): Promise<ChatThreadDetail | null> {
  const thread = await getChatThread(projectId, threadId);
  if (!thread) return null;

  const now = new Date();
  const scopeSnapshot: ChatScope = chatScopeSchema.parse(
    input.scopeSnapshot ?? thread.defaultScope
  );
  const title = thread.messages.length === 0 ? makeThreadTitle(input.content) : thread.title;

  await db.transaction(async (tx) => {
    const insertedMessages = await tx
      .insert(chatMessages)
      .values([
        {
          threadId,
          role: "user",
          content: input.content.trim(),
          scopeSnapshot
        },
        {
          threadId,
          role: "assistant",
          content: "",
          assistantStatus: "pending"
        }
      ])
      .returning();

    if (insertedMessages.length !== 2) {
      throw new Error("Chat message insert returned incomplete rows");
    }

    const [updatedThread] = await tx
      .update(chatThreads)
      .set({ title, updatedAt: now })
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.projectId, projectId)))
      .returning();

    if (!updatedThread) {
      throw new Error("Chat thread update returned no row");
    }
  });

  const detail = await getChatThread(projectId, threadId);
  if (!detail) {
    throw new Error("Chat thread disappeared after message insert");
  }

  return detail;
}
