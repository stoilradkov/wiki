import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createChatSearchRequest,
  createPendingGroundedChatMessage,
  streamGroundedChatMessage
} from "@wiki/backend/modules/chat/service";
import { chatMessageSchema, chatThreadDetailSchema, hybridSearchResultSchema } from "@wiki/shared";

const mocks = vi.hoisted(() => ({
  claimPendingAssistantMessageStream: vi.fn(),
  completeAssistantMessage: vi.fn(),
  createPendingChatExchange: vi.fn(),
  failAssistantMessage: vi.fn(),
  getChatThread: vi.fn()
}));

vi.mock("@wiki/backend/modules/chat/repository", () => ({
  claimPendingAssistantMessageStream: mocks.claimPendingAssistantMessageStream,
  completeAssistantMessage: mocks.completeAssistantMessage,
  createPendingChatExchange: mocks.createPendingChatExchange,
  failAssistantMessage: mocks.failAssistantMessage,
  getChatThread: mocks.getChatThread
}));

const projectId = "00000000-0000-4000-8000-00000000000a";
const selectedProjectId = "00000000-0000-4000-8000-00000000000b";
const threadId = "00000000-0000-4000-8000-000000000010";
const assistantMessageId = "00000000-0000-4000-8000-000000000011";
const userMessageId = "00000000-0000-4000-8000-000000000012";

const baseThread = chatThreadDetailSchema.parse({
  id: threadId,
  projectId,
  title: "Grounding",
  defaultScope: {
    scope: "current_project",
    selectedProjectIds: []
  },
  messages: [],
  createdAt: "2026-05-06T10:00:00.000Z",
  updatedAt: "2026-05-06T10:00:00.000Z"
});

const userMessage = chatMessageSchema.parse({
  id: userMessageId,
  threadId,
  role: "user",
  content: "What changed?",
  assistantStatus: null,
  scopeSnapshot: {
    scope: "current_project",
    selectedProjectIds: []
  },
  retrievedChunkReferences: [],
  modelMetadata: null,
  retrievalMetadata: null,
  createdAt: "2026-05-06T10:01:00.000Z",
  updatedAt: "2026-05-06T10:01:00.000Z"
});

const pendingAssistantMessage = chatMessageSchema.parse({
  id: assistantMessageId,
  threadId,
  role: "assistant",
  content: "",
  assistantStatus: "pending",
  scopeSnapshot: {
    scope: "current_project",
    selectedProjectIds: []
  },
  retrievedChunkReferences: [],
  modelMetadata: null,
  retrievalMetadata: null,
  createdAt: "2026-05-06T10:01:01.000Z",
  updatedAt: "2026-05-06T10:01:01.000Z"
});

const streamedThread = chatThreadDetailSchema.parse({
  ...baseThread,
  messages: [userMessage, pendingAssistantMessage]
});

const searchResult = hybridSearchResultSchema.parse({
  chunk: {
    id: "00000000-0000-4000-8000-000000000020",
    documentId: "00000000-0000-4000-8000-000000000030",
    markdownVersionId: "00000000-0000-4000-8000-000000000040",
    chunkIndex: 2,
    headingPath: ["Release notes"],
    content: "The release moved chat answers to grounded retrieval with chunk citations.",
    contentHash: "hash",
    tokenCount: 12,
    markdownOffsets: {
      start: 10,
      end: 82
    },
    embeddingModel: "gemini-embedding-2",
    embeddingDimension: 768,
    embeddingTaskType: "RETRIEVAL_DOCUMENT",
    embeddedAt: "2026-05-06T10:00:00.000Z",
    createdAt: "2026-05-06T10:00:00.000Z"
  },
  document: {
    id: "00000000-0000-4000-8000-000000000030",
    projectId,
    title: "Release Notes",
    status: "ready",
    sourceMetadata: {
      url: "https://example.com/release",
      author: "Docs team"
    },
    currentMarkdownVersionId: "00000000-0000-4000-8000-000000000040"
  },
  project: {
    id: projectId,
    name: "Wiki",
    archived: false
  },
  rank: 0.25,
  highlights: {
    chunk: "grounded retrieval",
    document: null
  },
  matchRanks: {
    fullText: 1,
    semantic: 2
  }
});

function createSink() {
  return {
    token: vi.fn(),
    completed: vi.fn(),
    error: vi.fn()
  };
}

function asyncIterableOf(deltas: string[]): AsyncIterable<string> {
  return (async function* () {
    for (const delta of deltas) {
      yield delta;
    }
  })();
}

describe("chat service", () => {
  beforeEach(() => {
    mocks.claimPendingAssistantMessageStream.mockReset();
    mocks.completeAssistantMessage.mockReset();
    mocks.createPendingChatExchange.mockReset();
    mocks.failAssistantMessage.mockReset();
    mocks.getChatThread.mockReset();
  });

  it("creates hybrid search input for selected chat scope", () => {
    expect(
      createChatSearchRequest(projectId, "answer me", {
        scope: "selected_projects",
        selectedProjectIds: [selectedProjectId]
      })
    ).toMatchObject({
      query: "answer me",
      scope: "selected_projects",
      selectedProjectIds: [selectedProjectId],
      projectIds: [selectedProjectId],
      includeArchivedProjects: false,
      includeDeletedDocuments: false,
      documentStatuses: ["ready"],
      limit: 8
    });
  });

  it("creates a pending exchange and returns assistant message id as stream id", async () => {
    mocks.getChatThread.mockResolvedValueOnce(baseThread).mockResolvedValueOnce(streamedThread);
    mocks.createPendingChatExchange.mockResolvedValue({
      assistantMessageId,
      scopeSnapshot: {
        scope: "current_project",
        selectedProjectIds: []
      }
    });

    await expect(
      createPendingGroundedChatMessage(projectId, threadId, { content: "What changed?" })
    ).resolves.toEqual({
      thread: streamedThread,
      streamId: assistantMessageId
    });
  });

  it("retrieves hybrid results, streams grounded answer, and persists citations", async () => {
    const streamAnswer = vi
      .fn()
      .mockReturnValue(asyncIterableOf(["Chat is ", "grounded now [C1]."]));
    const search = vi.fn().mockResolvedValue({ results: [searchResult] });
    const completedMessage = chatMessageSchema.parse({
      ...pendingAssistantMessage,
      content: "Chat is grounded now [C1].",
      assistantStatus: "completed"
    });
    const sink = createSink();
    mocks.getChatThread.mockResolvedValueOnce(streamedThread);
    mocks.claimPendingAssistantMessageStream.mockResolvedValue(pendingAssistantMessage);
    mocks.completeAssistantMessage.mockResolvedValue(completedMessage);

    await expect(
      streamGroundedChatMessage(projectId, threadId, assistantMessageId, sink, {
        streamAnswer,
        search
      })
    ).resolves.toBe(true);

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "What changed?",
        projectIds: [projectId],
        documentStatuses: ["ready"]
      })
    );
    expect(streamAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "What changed?",
        sourceContext: expect.stringContaining("[C1] Release Notes")
      })
    );
    expect(sink.token).toHaveBeenNthCalledWith(1, "Chat is ");
    expect(sink.token).toHaveBeenNthCalledWith(2, "grounded now [C1].");
    expect(mocks.completeAssistantMessage).toHaveBeenCalledWith(
      assistantMessageId,
      expect.objectContaining({
        content: "Chat is grounded now [C1].",
        references: [
          expect.objectContaining({
            chunkId: searchResult.chunk.id,
            documentTitle: "Release Notes",
            sourceMetadata: searchResult.document.sourceMetadata,
            markdownOffsets: searchResult.chunk.markdownOffsets,
            markdownVersionId: searchResult.chunk.markdownVersionId,
            chunkIndex: searchResult.chunk.chunkIndex,
            headingPath: searchResult.chunk.headingPath,
            snippet: searchResult.chunk.content
          })
        ]
      })
    );
    expect(sink.completed).toHaveBeenCalledWith(completedMessage);
    expect(sink.error).not.toHaveBeenCalled();
    expect(mocks.failAssistantMessage).not.toHaveBeenCalled();
  });

  it("answers with lack-of-information message when retrieval returns no chunks", async () => {
    const streamAnswer = vi.fn();
    const search = vi.fn().mockResolvedValue({ results: [] });
    const completedMessage = chatMessageSchema.parse({
      ...pendingAssistantMessage,
      content: "I do not have enough information in the knowledge base to answer that.",
      assistantStatus: "completed"
    });
    const sink = createSink();
    mocks.getChatThread.mockResolvedValueOnce(streamedThread);
    mocks.claimPendingAssistantMessageStream.mockResolvedValue(pendingAssistantMessage);
    mocks.completeAssistantMessage.mockResolvedValue(completedMessage);

    await expect(
      streamGroundedChatMessage(projectId, threadId, assistantMessageId, sink, {
        streamAnswer,
        search
      })
    ).resolves.toBe(true);

    expect(streamAnswer).not.toHaveBeenCalled();
    expect(sink.token).not.toHaveBeenCalled();
    expect(mocks.completeAssistantMessage).toHaveBeenCalledWith(
      assistantMessageId,
      expect.objectContaining({
        content: "I do not have enough information in the knowledge base to answer that.",
        references: []
      })
    );
    expect(sink.completed).toHaveBeenCalledWith(completedMessage);
  });

  it("surfaces assistant persistence errors instead of converting them to failed answers", async () => {
    const streamAnswer = vi
      .fn()
      .mockReturnValue(asyncIterableOf(["Chat is grounded now [C1]."]));
    const search = vi.fn().mockResolvedValue({ results: [searchResult] });
    const persistenceError = new Error("Chat assistant message update returned no row");
    const sink = createSink();
    mocks.getChatThread.mockResolvedValueOnce(streamedThread);
    mocks.claimPendingAssistantMessageStream.mockResolvedValue(pendingAssistantMessage);
    mocks.completeAssistantMessage.mockRejectedValue(persistenceError);

    await expect(
      streamGroundedChatMessage(projectId, threadId, assistantMessageId, sink, {
        streamAnswer,
        search
      })
    ).rejects.toThrow(persistenceError);

    expect(mocks.failAssistantMessage).not.toHaveBeenCalled();
    expect(sink.error).not.toHaveBeenCalled();
    expect(sink.completed).not.toHaveBeenCalled();
  });

  it("streams answer deltas and persists final buffered assistant content", async () => {
    const streamAnswer = vi
      .fn()
      .mockReturnValue(asyncIterableOf(["Chat ", "streams [C1]."]));
    const search = vi.fn().mockResolvedValue({ results: [searchResult] });
    const completedMessage = chatMessageSchema.parse({
      ...pendingAssistantMessage,
      content: "Chat streams [C1].",
      assistantStatus: "completed"
    });
    const sink = createSink();
    mocks.getChatThread.mockResolvedValueOnce(streamedThread);
    mocks.claimPendingAssistantMessageStream.mockResolvedValue(pendingAssistantMessage);
    mocks.completeAssistantMessage.mockResolvedValue(completedMessage);

    await expect(
      streamGroundedChatMessage(projectId, threadId, assistantMessageId, sink, {
        streamAnswer,
        search
      })
    ).resolves.toBe(true);

    expect(mocks.claimPendingAssistantMessageStream).toHaveBeenCalledWith(assistantMessageId);
    expect(sink.token).toHaveBeenNthCalledWith(1, "Chat ");
    expect(sink.token).toHaveBeenNthCalledWith(2, "streams [C1].");
    expect(mocks.completeAssistantMessage).toHaveBeenCalledWith(
      assistantMessageId,
      expect.objectContaining({
        content: "Chat streams [C1]."
      })
    );
    expect(sink.completed).toHaveBeenCalledWith(completedMessage);
    expect(sink.error).not.toHaveBeenCalled();
  });

  it("refuses to stream when claim returns null", async () => {
    const streamAnswer = vi.fn();
    const search = vi.fn();
    const sink = createSink();
    mocks.getChatThread.mockResolvedValueOnce(streamedThread);
    mocks.claimPendingAssistantMessageStream.mockResolvedValue(null);

    await expect(
      streamGroundedChatMessage(projectId, threadId, assistantMessageId, sink, {
        streamAnswer,
        search
      })
    ).resolves.toBe(false);

    expect(search).not.toHaveBeenCalled();
    expect(streamAnswer).not.toHaveBeenCalled();
    expect(mocks.completeAssistantMessage).not.toHaveBeenCalled();
    expect(mocks.failAssistantMessage).not.toHaveBeenCalled();
  });

  it("fails assistant message and emits sink.error when retrieval throws", async () => {
    const streamAnswer = vi.fn();
    const search = vi.fn().mockRejectedValue(new Error("hybrid search exploded"));
    const failedMessage = chatMessageSchema.parse({
      ...pendingAssistantMessage,
      content: "I could not generate a grounded answer right now.",
      assistantStatus: "failed"
    });
    const sink = createSink();
    mocks.getChatThread.mockResolvedValueOnce(streamedThread);
    mocks.claimPendingAssistantMessageStream.mockResolvedValue(pendingAssistantMessage);
    mocks.failAssistantMessage.mockResolvedValue(failedMessage);

    await expect(
      streamGroundedChatMessage(projectId, threadId, assistantMessageId, sink, {
        streamAnswer,
        search
      })
    ).resolves.toBe(true);

    expect(streamAnswer).not.toHaveBeenCalled();
    expect(sink.token).not.toHaveBeenCalled();
    expect(mocks.completeAssistantMessage).not.toHaveBeenCalled();
    expect(mocks.failAssistantMessage).toHaveBeenCalledWith(
      assistantMessageId,
      expect.objectContaining({
        content: "I could not generate a grounded answer right now.",
        references: [],
        retrievalMetadata: expect.objectContaining({ retrievedChunkCount: 0 })
      })
    );
    expect(sink.error).toHaveBeenCalledWith(failedMessage);
    expect(sink.completed).not.toHaveBeenCalled();
  });

  it("fails assistant message and emits sink.error when streaming throws mid-token", async () => {
    const streamAnswer = vi.fn().mockReturnValue(
      (async function* () {
        yield "Partial ";
        throw new Error("stream blew up");
      })()
    );
    const search = vi.fn().mockResolvedValue({ results: [searchResult] });
    const failedMessage = chatMessageSchema.parse({
      ...pendingAssistantMessage,
      content: "Partial",
      assistantStatus: "failed"
    });
    const sink = createSink();
    mocks.getChatThread.mockResolvedValueOnce(streamedThread);
    mocks.claimPendingAssistantMessageStream.mockResolvedValue(pendingAssistantMessage);
    mocks.failAssistantMessage.mockResolvedValue(failedMessage);

    await expect(
      streamGroundedChatMessage(projectId, threadId, assistantMessageId, sink, {
        streamAnswer,
        search
      })
    ).resolves.toBe(true);

    expect(sink.token).toHaveBeenCalledWith("Partial ");
    expect(mocks.completeAssistantMessage).not.toHaveBeenCalled();
    expect(mocks.failAssistantMessage).toHaveBeenCalledWith(
      assistantMessageId,
      expect.objectContaining({
        content: "Partial",
        references: expect.arrayContaining([
          expect.objectContaining({ chunkId: searchResult.chunk.id })
        ])
      })
    );
    expect(sink.error).toHaveBeenCalledWith(failedMessage);
    expect(sink.completed).not.toHaveBeenCalled();
  });
});
