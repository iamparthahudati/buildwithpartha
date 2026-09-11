import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@lib/apiClient";
import * as brainDumpModule from "@features/brain-dump";
import * as notesModule from "@features/notes";
import * as tasksModule from "@features/tasks";

import { replayMutationQueue, replaySingleMutation } from "../api/queueReplayer";
import { createQueuedMutation } from "../model/mutationQueue";
import { getQueuedMutation, saveQueuedMutation } from "../model/queueStorage";

vi.mock("@features/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof tasksModule>();
  return {
    ...actual,
    createTask: vi.fn(),
  };
});

vi.mock("@features/notes", async (importOriginal) => {
  const actual = await importOriginal<typeof notesModule>();
  return {
    ...actual,
    createNote: vi.fn(),
  };
});

vi.mock("@features/brain-dump", async (importOriginal) => {
  const actual = await importOriginal<typeof brainDumpModule>();
  return {
    ...actual,
    captureBrainDumpItem: vi.fn(),
  };
});

describe("queueReplayer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T10:00:00Z"));
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replays single TASK create mutation attaching Idempotency-Key header", async () => {
    const createTaskSpy = vi.mocked(tasksModule.createTask);
    createTaskSpy.mockResolvedValueOnce({
      id: "task-server-123",
      title: "Offline Task",
      description: null,
      status: "TO_DO",
      priority: "P2",
      project: null,
      dueAt: null,
      estimateMinutes: null,
      progress: 0,
      mitDate: null,
      isMit: false,
      commentCount: 0,
      blockerCount: 0,
      overdue: false,
      archivedAt: null,
      spentMinutes: null,
      deletedAt: null,
      labelIds: [],
      recurringSeriesId: null,
      recurrenceOccurrenceDate: null,
      version: 1,
      createdAt: "2026-09-02T12:00:00Z",
      updatedAt: "2026-09-02T12:00:00Z",
      href: "/life-os/app/tasks/task-server-123",
    });

    const mutation = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_TASK",
      endpoint: "/tasks",
      payload: { title: "Offline Task" },
    });

    const result = await replaySingleMutation(mutation);

    expect(result.success).toBe(true);
    expect(result.serverId).toBe("task-server-123");
    expect(createTaskSpy).toHaveBeenCalledWith(
      { title: "Offline Task" },
      { "Idempotency-Key": mutation.idempotencyKey },
    );
  });

  it("handles 409 conflict during replay", async () => {
    const createNoteSpy = vi.mocked(notesModule.createNote);
    createNoteSpy.mockRejectedValueOnce(
      new ApiError(409, {
        type: "about:blank",
        title: "Conflict",
        status: 409,
        detail: "Resource conflict",
        instance: "/notes",
        code: "CONCURRENCY_CONFLICT",
        correlationId: "c-123",
      }),
    );

    const mutation = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_NOTE",
      endpoint: "/notes",
      payload: { title: "Conflicting Note", body: "Body", labelIds: [], links: [] },
    });

    const result = await replaySingleMutation(mutation);

    expect(result.success).toBe(false);
    expect(result.isConflict).toBe(true);
    expect(result.error).toBe("Resource conflict");
  });

  it("replays full queue for user, removing succeeded items and updating status on failure/conflict", async () => {
    const createTaskSpy = vi.mocked(tasksModule.createTask);
    const captureBrainDumpSpy = vi.mocked(brainDumpModule.captureBrainDumpItem);

    createTaskSpy.mockResolvedValueOnce({
      id: "task-srv-1",
      title: "Task 1",
      description: null,
      status: "TO_DO",
      priority: "P2",
      project: null,
      dueAt: null,
      estimateMinutes: null,
      progress: 0,
      mitDate: null,
      isMit: false,
      commentCount: 0,
      blockerCount: 0,
      overdue: false,
      archivedAt: null,
      spentMinutes: null,
      deletedAt: null,
      labelIds: [],
      recurringSeriesId: null,
      recurrenceOccurrenceDate: null,
      version: 1,
      createdAt: "2026-09-02T12:00:00Z",
      updatedAt: "2026-09-02T12:00:00Z",
      href: "/life-os/app/tasks/task-srv-1",
    });

    captureBrainDumpSpy.mockRejectedValueOnce(new Error("Network disconnect"));

    const m1 = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_TASK",
      endpoint: "/tasks",
      payload: { title: "Task 1" },
      now: new Date("2026-09-02T10:00:00Z"),
    });

    const m2 = createQueuedMutation({
      userId: "user-100",
      type: "CREATE_BRAIN_DUMP_ITEM",
      endpoint: "/brain-dump-items",
      payload: { content: "Idea 1" },
      now: new Date("2026-09-02T11:00:00Z"),
    });

    saveQueuedMutation(m1);
    saveQueuedMutation(m2);

    const result = await replayMutationQueue("user-100");

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);

    // Succeeded item is removed
    expect(getQueuedMutation("user-100", m1.id)).toBeNull();

    // Failed item remains with updated attempt count and status
    const remainingM2 = getQueuedMutation("user-100", m2.id);
    expect(remainingM2).not.toBeNull();
    expect(remainingM2!.status).toBe("failed");
    expect(remainingM2!.attemptCount).toBe(1);
    expect(remainingM2!.lastError).toBeDefined();
  });
});
