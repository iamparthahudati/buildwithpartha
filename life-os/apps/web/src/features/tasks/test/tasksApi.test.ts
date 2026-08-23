import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";

import {
  addSubtask,
  addTaskDependency,
  deleteSubtask,
  getTaskDetail,
  mapBulkOutcome,
  mapTaskDetailResponse,
  mapTaskResponse,
  queryTasks,
  removeTaskDependency,
  reorderSubtasks,
  toBulkRequest,
  toggleSubtask,
  updateSubtask,
  type TaskDetailResponseDto,
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

const DETAIL_DTO: TaskDetailResponseDto = {
  task: {
    ...MOCK_DTO,
    spentMinutes: 35,
    subtasks: [
      {
        id: "subtask-1",
        taskId: "task-1",
        title: "Review open Tasks",
        completed: true,
        position: 0,
        createdAt: "2026-08-20T09:00:00Z",
        updatedAt: "2026-08-21T09:00:00Z",
        version: 2,
      },
    ],
  },
  dependencies: {
    blockers: [
      {
        id: "task-blocker",
        title: "Confirm review inputs",
        status: "TO_DO",
        priority: "P2",
        dueAt: null,
      },
    ],
    dependents: [],
    isBlocked: true,
    unresolvedBlockerCount: 1,
  },
  counts: {
    linkedTimeBlockCount: 0,
    focusSessionCount: 2,
    commentCount: 3,
    attachmentCount: 0,
    activityEventCount: 4,
  },
  version: 7,
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

  it("maps the canonical detail aggregate without creating a second Task copy", async () => {
    const mapped = mapTaskDetailResponse(
      DETAIL_DTO,
      new Map([
        [
          "project-life-os",
          { id: "project-life-os", name: "LifeOS", href: "/life-os/app/projects/project-life-os" },
        ],
      ]),
    );

    expect(mapped.task).toEqual(
      expect.objectContaining({
        id: "task-1",
        project: expect.objectContaining({ name: "LifeOS" }),
        spentMinutes: 35,
        commentCount: 3,
        blockerCount: 1,
        version: 7,
      }),
    );
    expect(mapped.subtasks).toEqual([
      expect.objectContaining({ id: "subtask-1", completed: true, version: 2 }),
    ]);
    expect(mapped.blockers[0]).toEqual(
      expect.objectContaining({
        id: "task-blocker",
        href: "/life-os/app/tasks/task-blocker",
      }),
    );

    mockApiRequest.mockResolvedValueOnce(DETAIL_DTO);
    await expect(getTaskDetail("task-1")).resolves.toEqual(expect.objectContaining({ version: 7 }));
    expect(mockApiRequest).toHaveBeenCalledWith("/tasks/task-1/detail", { method: "GET" });
  });

  it("uses the Task Subtask and dependency mutation contracts exactly", async () => {
    mockApiRequest.mockResolvedValue(MOCK_DTO);

    await addSubtask("task-1", "Draft decisions");
    await updateSubtask("task-1", "subtask-1", { title: "Review decisions" });
    await toggleSubtask("task-1", "subtask-1");
    await reorderSubtasks("task-1", ["subtask-2", "subtask-1"]);
    await deleteSubtask("task-1", "subtask-1");
    await addTaskDependency("task-1", "task-blocker", "BLOCKER");
    await removeTaskDependency("task-1", "task-blocker", "DEPENDENT");

    expect(mockApiRequest.mock.calls).toEqual([
      ["/tasks/task-1/subtasks", { method: "POST", body: { title: "Draft decisions" } }],
      ["/tasks/task-1/subtasks/subtask-1", { method: "PUT", body: { title: "Review decisions" } }],
      ["/tasks/task-1/subtasks/subtask-1/toggle", { method: "PATCH" }],
      [
        "/tasks/task-1/subtasks/reorder",
        { method: "PUT", body: { subtaskIds: ["subtask-2", "subtask-1"] } },
      ],
      ["/tasks/task-1/subtasks/subtask-1", { method: "DELETE" }],
      [
        "/tasks/task-1/dependencies",
        { method: "POST", body: { targetTaskId: "task-blocker", type: "BLOCKER" } },
      ],
      ["/tasks/task-1/dependencies/task-blocker?type=DEPENDENT", { method: "DELETE" }],
    ]);
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
