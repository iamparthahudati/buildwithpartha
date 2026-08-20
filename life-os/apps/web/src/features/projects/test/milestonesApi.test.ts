import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "@lib/apiClient";
import {
  mapMilestoneResponse,
  getMilestones,
  createMilestone,
  updateMilestone,
  updateMilestoneStatus,
  deleteMilestone,
  type MilestoneResponseDto,
} from "../api/milestonesApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

const MOCK_MILESTONE_DTO: MilestoneResponseDto = {
  id: "m-123",
  projectId: "proj-123",
  title: "Phase 1 Beta",
  date: "2026-08-30",
  status: "PLANNED",
  ordering: 1,
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-08-20T12:00:00Z",
  version: 1,
};

describe("milestonesApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("mapMilestoneResponse", () => {
    it("maps MilestoneResponseDto to Milestone domain model", () => {
      const milestone = mapMilestoneResponse(MOCK_MILESTONE_DTO);

      expect(milestone.id).toBe("m-123");
      expect(milestone.projectId).toBe("proj-123");
      expect(milestone.title).toBe("Phase 1 Beta");
      expect(milestone.date).toBe("2026-08-30");
      expect(milestone.status).toBe("PLANNED");
      expect(milestone.ordering).toBe(1);
      expect(milestone.version).toBe(1);
    });
  });

  describe("getMilestones", () => {
    it("fetches milestones for project", async () => {
      mockApiRequest.mockResolvedValueOnce([MOCK_MILESTONE_DTO]);

      const result = await getMilestones("proj-123");

      expect(mockApiRequest).toHaveBeenCalledWith("/projects/proj-123/milestones", {
        method: "GET",
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Phase 1 Beta");
    });
  });

  describe("createMilestone", () => {
    it("sends POST request to create milestone", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_MILESTONE_DTO);

      const created = await createMilestone("proj-123", {
        title: "Phase 1 Beta",
        date: "2026-08-30",
        status: "PLANNED",
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/projects/proj-123/milestones", {
        method: "POST",
        body: {
          title: "Phase 1 Beta",
          date: "2026-08-30",
          status: "PLANNED",
        },
      });
      expect(created.id).toBe("m-123");
    });
  });

  describe("updateMilestone", () => {
    it("sends PUT request to update milestone", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_MILESTONE_DTO, version: 2 });

      const updated = await updateMilestone("proj-123", "m-123", {
        title: "Phase 1 Final",
        version: 1,
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/projects/proj-123/milestones/m-123", {
        method: "PUT",
        body: {
          title: "Phase 1 Final",
          version: 1,
        },
      });
      expect(updated.version).toBe(2);
    });
  });

  describe("updateMilestoneStatus", () => {
    it("sends PUT request to status endpoint", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_MILESTONE_DTO, status: "COMPLETED" });

      const updated = await updateMilestoneStatus("proj-123", "m-123", {
        status: "COMPLETED",
        version: 1,
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/projects/proj-123/milestones/m-123/status", {
        method: "PUT",
        body: {
          status: "COMPLETED",
          version: 1,
        },
      });
      expect(updated.status).toBe("COMPLETED");
    });
  });

  describe("deleteMilestone", () => {
    it("sends DELETE request for milestone", async () => {
      mockApiRequest.mockResolvedValueOnce(undefined);

      await deleteMilestone("proj-123", "m-123");

      expect(mockApiRequest).toHaveBeenCalledWith("/projects/proj-123/milestones/m-123", {
        method: "DELETE",
      });
    });
  });
});
