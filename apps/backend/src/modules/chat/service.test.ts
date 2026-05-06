import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createChatSearchRequest,
  createGroundedChatMessage
} from "@wiki/backend/modules/chat/service";
import { chatThreadDetailSchema, hybridSearchResultSchema } from "@wiki/shared";

const mocks = vi.hoisted(() => ({
  completeAssistantMessage: vi.fn(),
  createPendingChatExchange: vi.fn(),
  failAssistantMessage: vi.fn(),
  getChatThread: vi.fn()
}));

vi.mock("@wiki/backend/modules/chat/repository", () => ({
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

const completedThread = chatThreadDetailSchema.parse({
  ...baseThread,
  messages: [
    {
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
    }
  ]
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
    sourceMetadata: {},
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

describe("chat service", () => {
  beforeEach(() => {
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

  it("retrieves hybrid results, generates grounded answer, and persists citations", async () => {
    const generateAnswer = vi.fn().mockResolvedValue("Chat is grounded now [C1].");
    const search = vi.fn().mockResolvedValue({ results: [searchResult] });
    mocks.getChatThread.mockResolvedValueOnce(baseThread).mockResolvedValueOnce(completedThread);
    mocks.createPendingChatExchange.mockResolvedValue({
      assistantMessageId,
      scopeSnapshot: {
        scope: "current_project",
        selectedProjectIds: []
      }
    });

    const result = await createGroundedChatMessage(
      projectId,
      threadId,
      { content: "What changed?" },
      { generateAnswer, search }
    );

    expect(result).toEqual(completedThread);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "What changed?",
        projectIds: [projectId],
        documentStatuses: ["ready"]
      })
    );
    expect(generateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "What changed?",
        sourceContext: expect.stringContaining("[C1] Release Notes")
      })
    );
    expect(mocks.completeAssistantMessage).toHaveBeenCalledWith(
      assistantMessageId,
      expect.objectContaining({
        content: "Chat is grounded now [C1].",
        references: [
          expect.objectContaining({
            chunkId: searchResult.chunk.id,
            documentTitle: "Release Notes",
            snippet: searchResult.chunk.content
          })
        ]
      })
    );
    expect(mocks.failAssistantMessage).not.toHaveBeenCalled();
  });

  it("answers with lack-of-information message when retrieval returns no chunks", async () => {
    const generateAnswer = vi.fn();
    const search = vi.fn().mockResolvedValue({ results: [] });
    mocks.getChatThread.mockResolvedValueOnce(baseThread).mockResolvedValueOnce(completedThread);
    mocks.createPendingChatExchange.mockResolvedValue({
      assistantMessageId,
      scopeSnapshot: {
        scope: "current_project",
        selectedProjectIds: []
      }
    });

    await createGroundedChatMessage(
      projectId,
      threadId,
      { content: "Unknown?" },
      { generateAnswer, search }
    );

    expect(generateAnswer).not.toHaveBeenCalled();
    expect(mocks.completeAssistantMessage).toHaveBeenCalledWith(
      assistantMessageId,
      expect.objectContaining({
        content: "I do not have enough information in the knowledge base to answer that.",
        references: []
      })
    );
  });

  it("surfaces assistant persistence errors instead of converting them to failed answers", async () => {
    const generateAnswer = vi.fn().mockResolvedValue("Chat is grounded now [C1].");
    const search = vi.fn().mockResolvedValue({ results: [searchResult] });
    const persistenceError = new Error("Chat assistant message update returned no row");
    mocks.getChatThread.mockResolvedValueOnce(baseThread);
    mocks.createPendingChatExchange.mockResolvedValue({
      assistantMessageId,
      scopeSnapshot: {
        scope: "current_project",
        selectedProjectIds: []
      }
    });
    mocks.completeAssistantMessage.mockRejectedValue(persistenceError);

    await expect(
      createGroundedChatMessage(
        projectId,
        threadId,
        { content: "What changed?" },
        { generateAnswer, search }
      )
    ).rejects.toThrow(persistenceError);

    expect(mocks.failAssistantMessage).not.toHaveBeenCalled();
  });
});
