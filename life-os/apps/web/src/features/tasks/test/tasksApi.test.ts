import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";

import {
  mapBulkOutcome,
  mapTaskResponse,
  queryTasks,
  toBulkRequest,
  type TaskQueryResponseDto,
  type TaskResponseDto,
} from "../api/tasksApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

const MOCK_DTO: TaskResponseDto = {
  id: "task-1",
  userId: "user-1",
  projectId: "project-life-os",
  title: "Prepare weekly review",
  description: "Gather open Tasks.",
  status: "IN_PROGRESS",
  priority: "P1",
  dueAt: "2026-08-22T12:00:00Z",
  estimateMinutes: 90,
  progress: 40,
  mitDate: "2026-08-21",
  overdue: false,
  archived: false,
  archivedAt: null,
  createdAt: "2026-08-18T09:00:00Z",
  updatedAt: "2026-08-21T08:00:00Z",
  labelIds: ["label-planning"],
  version: 3,
};

describe("tasksApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps a task list projection, including MIT and Project context", () => {
    const task = mapTaskResponse(
      MOCK_DTO,
      new Map([
        [
          "project-life-os",
          { id: "project-life-os", name: "LifeOS", href: "/life-os/app/projects/project-life-os" },
        ],
      ]),
    );

    expect(task.title).toBe("Prepare weekly review");
    expect(task.isMit).toBe(true);
    expect(task.project?.name).toBe("LifeOS");
    expect(task.commentCount).toBe(0);
    expect(task.href).toBe("/life-os/app/tasks/task-1");
  });

  it("builds list query parameters and maps the page plus summary", async () => {
    const response: TaskQueryResponseDto = {
      page: {
        items: [MOCK_DTO],
        page: 0,
        size: 10,
        totalItems: 1,
        totalPages: 1,
      },
      summary: {
        total: 4,
        toDo: 2,
        inProgress: 1,
        blocked: 0,
        done: 1,
        cancelled: 0,
        overdue: 1,
        mit: 1,
      },
    };
    mockApiRequest.mockResolvedValueOnce(response);

    const result = await queryTasks({
      q: "review",
      status: ["IN_PROGRESS"],
      archived: false,
      page: 0,
      size: 10,
      sortBy: "updatedAt",
      sortDirection: "DESC",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/tasks?q=review&status=IN_PROGRESS&archived=false&page=0&size=10&sortBy=updatedAt&sortDirection=DESC",
      { method: "GET" },
    );
    expect(result.items).toHaveLength(1);
    expect(result.summary).toEqual({
      total: 4,
      toDo: 2,
      inProgress: 1,
      done: 1,
      blocked: 0,
      overdue: 1,
    });
  });

  it("maps bulk requests and failed item titles", () => {
    expect(toBulkRequest(["task-1"], { type: "ARCHIVE" })).toEqual({
      taskIds: ["task-1"],
      action: "ARCHIVE",
    });
    expect(
      mapBulkOutcome(
        {
          requested: 2,
          succeeded: 1,
          failed: 1,
          results: [
            { taskId: "task-1", outcome: "SUCCEEDED", task: MOCK_DTO },
            { taskId: "task-2", outcome: "FAILED", errorCode: "CONCURRENCY_CONFLICT" },
          ],
        },
        new Map([["task-2", "Pay household bills"]]),
      ),
    ).toEqual({
      requested: 2,
      succeeded: 1,
      failed: [
        {
          taskId: "task-2",
          title: "Pay household bills",
          errorCode: "CONCURRENCY_CONFLICT",
        },
      ],
    });
  });
});
