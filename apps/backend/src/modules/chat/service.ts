import { createGoogleGenerativeAI, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import { env } from "@wiki/backend/env";
import {
  completeAssistantMessage,
  createPendingChatExchange,
  claimPendingAssistantMessageStream,
  failAssistantMessage,
  getChatThread
} from "@wiki/backend/modules/chat/repository";
import { searchHybrid } from "@wiki/backend/modules/search/service";
import {
  chatModelMetadataSchema,
  chatRetrievedChunkReferenceSchema,
  chatRetrievalMetadataSchema,
  type ChatRetrievedChunkReference,
  type ChatScope,
  type ChatThreadDetail,
  type CreateChatMessageRequest,
  type HybridSearchRequest,
  type HybridSearchResult
} from "@wiki/shared";

const retrievalLimit = 8;
const noKnowledgeBaseAnswer =
  "I do not have enough information in the knowledge base to answer that.";
const generationFailedAnswer = "I could not generate a grounded answer right now.";

export type ChatAnswerGenerator = (input: {
  question: string;
  references: ChatRetrievedChunkReference[];
  sourceContext: string;
}) => Promise<string>;

export type ChatAnswerStreamer = (input: {
  question: string;
  references: ChatRetrievedChunkReference[];
  sourceContext: string;
}) => AsyncIterable<string>;

export type GroundedChatDependencies = {
  generateAnswer: ChatAnswerGenerator;
  search: (input: HybridSearchRequest) => Promise<{ results: HybridSearchResult[] }>;
};

export type GroundedChatStreamDependencies = {
  streamAnswer: ChatAnswerStreamer;
  search: (input: HybridSearchRequest) => Promise<{ results: HybridSearchResult[] }>;
};

export type PendingGroundedChatMessage = {
  thread: ChatThreadDetail;
  streamId: string;
};

export type ChatStreamSink = {
  token: (delta: string) => void;
  completed: (message: ChatThreadDetail["messages"][number]) => void;
  error: (message: ChatThreadDetail["messages"][number]) => void;
};

export async function createPendingGroundedChatMessage(
  projectId: string,
  threadId: string,
  input: CreateChatMessageRequest
): Promise<PendingGroundedChatMessage | null> {
  const thread = await getChatThread(projectId, threadId);
  if (!thread) return null;

  const pending = await createPendingChatExchange(projectId, thread, input);
  const updatedThread = await getUpdatedThread(projectId, threadId);

  return {
    thread: updatedThread,
    streamId: pending.assistantMessageId
  };
}

export async function createGroundedChatMessage(
  projectId: string,
  threadId: string,
  input: CreateChatMessageRequest,
  dependencies: GroundedChatDependencies = {
    generateAnswer: generateGroundedAnswer,
    search: searchHybrid
  }
): Promise<ChatThreadDetail | null> {
  const thread = await getChatThread(projectId, threadId);
  if (!thread) return null;

  const pending = await createPendingChatExchange(projectId, thread, input);
  const query = input.content.trim();
  const scopeSnapshot = pending.scopeSnapshot;
  const requestedAt = new Date();
  const modelMetadata = chatModelMetadataSchema.parse({
    provider: "gemini",
    generationModel: env.AI_GENERATION_MODEL,
    embeddingModel: env.AI_EMBEDDING_MODEL,
    embeddingDimension: env.AI_EMBEDDING_DIMENSION,
    thinkingBudget: env.AI_THINKING_BUDGET_CHAT
  });
  const emptyRetrievalMetadata = chatRetrievalMetadataSchema.parse({
    query,
    scope: scopeSnapshot,
    requestedAt: requestedAt.toISOString(),
    limit: retrievalLimit,
    retrievedChunkCount: 0
  });

  let retrieval: { results: HybridSearchResult[] };
  try {
    retrieval = await dependencies.search(createChatSearchRequest(projectId, query, scopeSnapshot));
  } catch {
    await failAssistantMessage(pending.assistantMessageId, {
      content: generationFailedAnswer,
      modelMetadata,
      references: [],
      retrievalMetadata: emptyRetrievalMetadata
    });

    return getUpdatedThread(projectId, threadId);
  }

  const references = retrieval.results.map(mapSearchResultToReference);
  const retrievalMetadata = chatRetrievalMetadataSchema.parse({
    query,
    scope: scopeSnapshot,
    requestedAt: requestedAt.toISOString(),
    limit: retrievalLimit,
    retrievedChunkCount: references.length
  });

  let content = noKnowledgeBaseAnswer;
  let status: "completed" | "failed" = "completed";

  if (references.length > 0) {
    try {
      content = await dependencies.generateAnswer({
        question: query,
        references,
        sourceContext: buildSourceContext(retrieval.results)
      });
    } catch {
      content = generationFailedAnswer;
      status = "failed";
    }
  }

  if (status === "failed") {
    await failAssistantMessage(pending.assistantMessageId, {
      content,
      modelMetadata,
      references,
      retrievalMetadata
    });

    return getUpdatedThread(projectId, threadId);
  }

  await completeAssistantMessage(pending.assistantMessageId, {
    content: content.trim() || noKnowledgeBaseAnswer,
    modelMetadata,
    references,
    retrievalMetadata
  });

  return getUpdatedThread(projectId, threadId);
}

export async function streamGroundedChatMessage(
  projectId: string,
  threadId: string,
  assistantMessageId: string,
  sink: ChatStreamSink,
  dependencies: GroundedChatStreamDependencies = {
    streamAnswer: streamGroundedAnswer,
    search: searchHybrid
  }
): Promise<boolean> {
  const thread = await getChatThread(projectId, threadId);
  if (!thread) return false;

  const assistantMessage = thread.messages.find((message) => message.id === assistantMessageId);
  const userMessage = findUserMessageBeforeAssistant(thread, assistantMessageId);

  if (!assistantMessage || assistantMessage.role !== "assistant" || !userMessage) {
    return false;
  }

  const query = userMessage.content.trim();
  const scopeSnapshot = assistantMessage.scopeSnapshot ?? thread.defaultScope;
  const requestedAt = new Date();
  const modelMetadata = createChatModelMetadata();
  const emptyRetrievalMetadata = chatRetrievalMetadataSchema.parse({
    query,
    scope: scopeSnapshot,
    requestedAt: requestedAt.toISOString(),
    limit: retrievalLimit,
    retrievedChunkCount: 0
  });

  const claimedMessage = await claimPendingAssistantMessageStream(assistantMessageId);
  if (!claimedMessage) return false;

  let retrieval: { results: HybridSearchResult[] };
  try {
    retrieval = await dependencies.search(createChatSearchRequest(projectId, query, scopeSnapshot));
  } catch {
    const failed = await failAssistantMessage(assistantMessageId, {
      content: generationFailedAnswer,
      modelMetadata,
      references: [],
      retrievalMetadata: emptyRetrievalMetadata
    });
    sink.error(failed);
    return true;
  }

  const references = retrieval.results.map(mapSearchResultToReference);
  const retrievalMetadata = chatRetrievalMetadataSchema.parse({
    query,
    scope: scopeSnapshot,
    requestedAt: requestedAt.toISOString(),
    limit: retrievalLimit,
    retrievedChunkCount: references.length
  });

  if (references.length === 0) {
    const completed = await completeAssistantMessage(assistantMessageId, {
      content: noKnowledgeBaseAnswer,
      modelMetadata,
      references,
      retrievalMetadata
    });
    sink.completed(completed);
    return true;
  }

  let content = "";

  try {
    for await (const delta of dependencies.streamAnswer({
      question: query,
      references,
      sourceContext: buildSourceContext(retrieval.results)
    })) {
      content += delta;
      sink.token(delta);
    }
  } catch {
    const failed = await failAssistantMessage(assistantMessageId, {
      content: content.trim() || generationFailedAnswer,
      modelMetadata,
      references,
      retrievalMetadata
    });
    sink.error(failed);
    return true;
  }

  const completed = await completeAssistantMessage(assistantMessageId, {
    content: content.trim() || noKnowledgeBaseAnswer,
    modelMetadata,
    references,
    retrievalMetadata
  });
  sink.completed(completed);

  return true;
}

async function getUpdatedThread(projectId: string, threadId: string): Promise<ChatThreadDetail> {
  const updatedThread = await getChatThread(projectId, threadId);
  if (!updatedThread) {
    throw new Error("Chat thread disappeared after grounded answer generation");
  }

  return updatedThread;
}

export function createChatSearchRequest(
  projectId: string,
  query: string,
  scope: ChatScope
): HybridSearchRequest {
  return {
    query,
    scope: scope.scope,
    selectedProjectIds: scope.selectedProjectIds,
    projectIds: resolveChatProjectIds(projectId, scope),
    includeArchivedProjects: false,
    includeDeletedDocuments: false,
    documentStatuses: ["ready"],
    tags: [],
    entityNames: [],
    entityTypes: [],
    limit: retrievalLimit
  };
}

function resolveChatProjectIds(projectId: string, scope: ChatScope): string[] | undefined {
  if (scope.scope === "all_projects") return undefined;
  if (scope.scope === "selected_projects") return scope.selectedProjectIds;
  return [projectId];
}

function mapSearchResultToReference(
  result: HybridSearchResult,
  index: number
): ChatRetrievedChunkReference {
  return chatRetrievedChunkReferenceSchema.parse({
    chunkId: result.chunk.id,
    documentId: result.document.id,
    markdownVersionId: result.chunk.markdownVersionId,
    projectId: result.project.id,
    chunkIndex: result.chunk.chunkIndex,
    headingPath: result.chunk.headingPath,
    documentTitle: result.document.title,
    projectName: result.project.name,
    rank: result.rank,
    snippet: createCitationSnippet(result.chunk.content, index)
  });
}

function findUserMessageBeforeAssistant(
  thread: ChatThreadDetail,
  assistantMessageId: string
): ChatThreadDetail["messages"][number] | null {
  const assistantIndex = thread.messages.findIndex((message) => message.id === assistantMessageId);
  if (assistantIndex <= 0) return null;

  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    const message = thread.messages[index];
    if (message?.role === "user") return message;
  }

  return null;
}

function createChatModelMetadata() {
  return chatModelMetadataSchema.parse({
    provider: "gemini",
    generationModel: env.AI_GENERATION_MODEL,
    embeddingModel: env.AI_EMBEDDING_MODEL,
    embeddingDimension: env.AI_EMBEDDING_DIMENSION,
    thinkingBudget: env.AI_THINKING_BUDGET_CHAT
  });
}

function createCitationSnippet(content: string, index: number): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  const snippet = normalized.length <= 360 ? normalized : `${normalized.slice(0, 357)}...`;
  return snippet.length > 0 ? snippet : `Source chunk ${index + 1}`;
}

function buildSourceContext(results: HybridSearchResult[]): string {
  return results
    .map((result, index) => {
      const label = `C${index + 1}`;
      const title = result.document.title ?? "Untitled document";
      const heading =
        result.chunk.headingPath.length > 0
          ? result.chunk.headingPath.join(" / ")
          : `Chunk ${result.chunk.chunkIndex + 1}`;

      return [
        `[${label}] ${title}`,
        `Project: ${result.project.name}`,
        `Heading: ${heading}`,
        `Content:`,
        result.chunk.content
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

export async function generateGroundedAnswer(input: {
  question: string;
  references: ChatRetrievedChunkReference[];
  sourceContext: string;
}): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required for grounded chat answers");
  }

  const google = createGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY
  });
  const { text } = await generateText({
    model: google(normalizeGeminiModelName(env.AI_GENERATION_MODEL)),
    system: [
      "You answer questions using only the retrieved knowledge base sources.",
      "Do not use general model knowledge by default.",
      "If the sources do not contain enough information, say the knowledge base does not have enough information.",
      "Cite every source-backed claim with bracket citations like [C1] or [C2].",
      "Do not cite sources that do not support the claim."
    ].join(" "),
    prompt: [
      `Question: ${input.question}`,
      "Retrieved sources:",
      input.sourceContext,
      "Answer from these sources only."
    ].join("\n\n"),
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: env.AI_THINKING_BUDGET_CHAT
        }
      } satisfies GoogleLanguageModelOptions
    }
  });

  return text;
}

export function streamGroundedAnswer(input: {
  question: string;
  references: ChatRetrievedChunkReference[];
  sourceContext: string;
}): AsyncIterable<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required for grounded chat answers");
  }

  const google = createGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY
  });
  const { textStream } = streamText({
    model: google(normalizeGeminiModelName(env.AI_GENERATION_MODEL)),
    system: [
      "You answer questions using only the retrieved knowledge base sources.",
      "Do not use general model knowledge by default.",
      "If the sources do not contain enough information, say the knowledge base does not have enough information.",
      "Cite every source-backed claim with bracket citations like [C1] or [C2].",
      "Do not cite sources that do not support the claim."
    ].join(" "),
    prompt: [
      `Question: ${input.question}`,
      "Retrieved sources:",
      input.sourceContext,
      "Answer from these sources only."
    ].join("\n\n"),
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: env.AI_THINKING_BUDGET_CHAT
        }
      } satisfies GoogleLanguageModelOptions
    }
  });

  return textStream;
}

function normalizeGeminiModelName(modelName: string): string {
  return modelName.startsWith("models/") ? modelName.slice("models/".length) : modelName;
}
