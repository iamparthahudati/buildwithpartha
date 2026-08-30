import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "@lib/apiClient";
import {
  getMilestoneTasks,
  mapMilestoneTaskItem,
  type MilestoneTaskItemDto,
  type MilestoneTasksResponseDto,
} from "../api/milestoneTasksApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

const ITEM: MilestoneTaskItemDto = {
  taskId: "t-1",
  title: "Wire MIT provider",
  status: "IN_PROGRESS",
  priority: "P1",
  estimateMinutes: 360,
};

describe("milestoneTasksApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps a milestone task item DTO to the summary model", () => {
    const summary = mapMilestoneTaskItem(ITEM);
    expect(summary.taskId).toBe("t-1");
    expect(summary.title).toBe("Wire MIT provider");
    expect(summary.status).toBe("IN_PROGRESS");
    expect(summary.priority).toBe("P1");
    expect(summary.estimateMinutes).toBe(360);
  });

  it("requests the milestone tasks endpoint and maps the response", async () => {
    const response: MilestoneTasksResponseDto = { tasks: [ITEM] };
    mockApiRequest.mockResolvedValueOnce(response);

    const tasks = await getMilestoneTasks("m-1");

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/milestones/m-1/tasks",
      expect.objectContaining({ method: "GET" }),
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.taskId).toBe("t-1");
  });

  it("returns an empty list when the milestone has no tasks", async () => {
    mockApiRequest.mockResolvedValueOnce({ tasks: [] } satisfies MilestoneTasksResponseDto);
    const tasks = await getMilestoneTasks("m-2");
    expect(tasks).toEqual([]);
  });
});
