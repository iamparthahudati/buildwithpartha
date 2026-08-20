import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "@lib/apiClient";
import {
  mapProjectResponse,
  queryProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
  type ProjectResponseDto,
  type ProjectQueryResponseDto,
} from "../api/projectsApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

const MOCK_DTO: ProjectResponseDto = {
  id: "proj-123",
  userId: "user-456",
  name: "API Test Project",
  description: "Testing API mapper",
  status: "ACTIVE",
  priority: "P1",
  health: "ON_TRACK",
  color: "blue",
  icon: "rocket",
  startDate: "2026-08-01",
  deadlineDate: "2026-08-31",
  estimateMinutes: 120,
  archivedAt: null,
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-08-20T12:00:00Z",
  labelIds: [],
  version: 2,
};

describe("projectsApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("mapProjectResponse", () => {
    it("correctly maps ProjectResponseDto to Project domain model", () => {
      const project = mapProjectResponse(MOCK_DTO);

      expect(project.id).toBe("proj-123");
      expect(project.name).toBe("API Test Project");
      expect(project.description).toBe("Testing API mapper");
      expect(project.status).toBe("ACTIVE");
      expect(project.priority).toBe("P1");
      expect(project.health).toBe("ON_TRACK");
      expect(project.color).toBe("blue");
      expect(project.icon).toBe("rocket");
      expect(project.startDate).toBe("2026-08-01");
      expect(project.deadlineDate).toBe("2026-08-31");
      expect(project.archivedAt).toBeNull();
      expect(project.version).toBe(2);
    });
  });

  describe("queryProjects", () => {
    it("constructs correct search parameters and fetches projects", async () => {
      const mockQueryResponse: ProjectQueryResponseDto = {
        page: {
          items: [MOCK_DTO],
          page: 0,
          size: 6,
          totalItems: 1,
          totalPages: 1,
          first: true,
          last: true,
        },
        summary: {
          total: 1,
          active: 1,
          completed: 0,
          onHold: 0,
          atRisk: 0,
          averageProgress: 50,
        },
      };

      mockApiRequest.mockResolvedValueOnce(mockQueryResponse);

      const result = await queryProjects({
        q: "Test",
        status: ["ACTIVE"],
        priority: ["P1"],
        health: ["ON_TRACK"],
        archived: false,
        page: 0,
        size: 6,
        sortBy: "name",
        sortDirection: "ASC",
      });

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/projects?q=Test&status=ACTIVE&priority=P1&health=ON_TRACK&archived=false&page=0&size=6&sortBy=name&sortDirection=ASC",
        { method: "GET" },
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe("API Test Project");
      expect(result.summary.active).toBe(1);
    });
  });

  describe("getProject", () => {
    it("fetches single project by ID", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_DTO);

      const project = await getProject("proj-123");

      expect(mockApiRequest).toHaveBeenCalledWith("/projects/proj-123", { method: "GET" });
      expect(project.id).toBe("proj-123");
    });
  });

  describe("createProject", () => {
    it("sends POST request with project payload", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_DTO);

      const created = await createProject({
        name: "New Project",
        status: "ACTIVE",
        priority: "P1",
        health: "ON_TRACK",
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/projects", {
        method: "POST",
        body: {
          name: "New Project",
          status: "ACTIVE",
          priority: "P1",
          health: "ON_TRACK",
        },
      });
      expect(created.id).toBe("proj-123");
    });
  });

  describe("updateProject", () => {
    it("sends PUT request with updated project payload", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_DTO, version: 3 });

      const updated = await updateProject("proj-123", {
        name: "Updated Name",
        version: 2,
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/projects/proj-123", {
        method: "PUT",
        body: {
          name: "Updated Name",
          version: 2,
        },
      });
      expect(updated.version).toBe(3);
    });
  });

  describe("archiveProject", () => {
    it("sends POST request to archive endpoint", async () => {
      mockApiRequest.mockResolvedValueOnce({
        ...MOCK_DTO,
        archivedAt: "2026-08-20T12:00:00Z",
      });

      const archived = await archiveProject("proj-123", { version: 2 });

      expect(mockApiRequest).toHaveBeenCalledWith("/projects/proj-123/archive", {
        method: "POST",
        body: { version: 2 },
      });
      expect(archived.archivedAt).toBe("2026-08-20T12:00:00Z");
    });
  });

  describe("restoreProject", () => {
    it("sends POST request to restore endpoint", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_DTO);

      const restored = await restoreProject("proj-123", { version: 2 });

      expect(mockApiRequest).toHaveBeenCalledWith("/projects/proj-123/restore", {
        method: "POST",
        body: { version: 2 },
      });
      expect(restored.archivedAt).toBeNull();
    });
  });

  describe("deleteProject", () => {
    it("sends DELETE request", async () => {
      mockApiRequest.mockResolvedValueOnce(undefined);

      await deleteProject("proj-123");

      expect(mockApiRequest).toHaveBeenCalledWith("/projects/proj-123", {
        method: "DELETE",
      });
    });
  });
});
