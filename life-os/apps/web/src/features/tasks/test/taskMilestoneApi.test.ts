import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "@lib/apiClient";
import {
  assignTaskMilestone,
  clearTaskMilestone,
  getTaskMilestone,
  type TaskMilestoneAssignmentDto,
} from "../api/taskMilestoneApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

const ASSIGNED: TaskMilestoneAssignmentDto = {
  milestone: {
    milestoneId: "m-1",
    projectId: "p-1",
    title: "Beta launch",
    date: "2026-11-30",
  },
};

describe("taskMilestoneApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("assigns a task to a milestone and maps the result", async () => {
    mockApiRequest.mockResolvedValueOnce(ASSIGNED);

    const result = await assignTaskMilestone("t-1", "m-1");

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/tasks/t-1/milestone",
      expect.objectContaining({ method: "PUT", body: { milestoneId: "m-1" } }),
    );
    expect(result?.milestoneId).toBe("m-1");
    expect(result?.date).toBe("2026-11-30");
  });

  it("returns null when the assignment endpoint reports no milestone", async () => {
    mockApiRequest.mockResolvedValueOnce({ milestone: null } satisfies TaskMilestoneAssignmentDto);
    const result = await getTaskMilestone("t-2");
    expect(result).toBeNull();
  });

  it("clears a milestone assignment", async () => {
    mockApiRequest.mockResolvedValueOnce(undefined);
    await clearTaskMilestone("t-1");
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/tasks/t-1/milestone",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
