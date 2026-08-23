import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";

import { queryActivity, type ActivityPageDto } from "../api/activityApi";

vi.mock("@lib/apiClient", () => ({ apiRequest: vi.fn() }));

const mockApiRequest = vi.mocked(apiRequest);

const PAGE: ActivityPageDto = {
  items: [],
  page: 1,
  size: 20,
  totalItems: 24,
  totalPages: 2,
};

describe("activityApi", () => {
  beforeEach(() => vi.resetAllMocks());

  it("requests bounded zero-based Task and Project pages", async () => {
    mockApiRequest.mockResolvedValue(PAGE);

    await expect(queryActivity("TASK", "task/with space", 1, 20)).resolves.toBe(PAGE);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/tasks/task%2Fwith%20space/activity?page=1&size=20",
      { method: "GET" },
    );

    await queryActivity("PROJECT", "project-1", 0, 100);
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "/projects/project-1/activity?page=0&size=100",
      { method: "GET" },
    );
  });
});
