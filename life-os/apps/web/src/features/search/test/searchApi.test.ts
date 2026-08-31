import { describe, expect, it, vi } from "vitest";
import * as apiClient from "@lib/apiClient";
import { searchGlobal } from "../api/searchApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

describe("searchApi", () => {
  it("calls /search without query parameters when params are empty", async () => {
    const mockResponse = {
      query: "",
      totalItems: 0,
      page: 0,
      size: 20,
      totalPages: 0,
      counts: {},
      groups: [],
      items: [],
    };
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce(mockResponse);

    const result = await searchGlobal({});
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/search", {});
    expect(result).toEqual(mockResponse);
  });

  it("builds query parameters with q, types, page, and size", async () => {
    const mockResponse = {
      query: "project",
      totalItems: 1,
      page: 0,
      size: 10,
      totalPages: 1,
      counts: { PROJECT: 1 },
      groups: [],
      items: [],
    };
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce(mockResponse);

    const result = await searchGlobal({
      q: "project",
      types: ["PROJECT", "TASK"],
      page: 0,
      size: 10,
    });

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      "/search?q=project&types=PROJECT%2CTASK&page=0&size=10",
      {},
    );
    expect(result).toEqual(mockResponse);
  });

  it("builds query parameter for single type filter", async () => {
    const mockResponse = {
      query: "task",
      totalItems: 5,
      page: 1,
      size: 20,
      totalPages: 1,
      counts: { TASK: 5 },
      groups: [],
      items: [],
    };
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce(mockResponse);

    await searchGlobal({
      q: "task",
      type: "TASK",
      page: 1,
    });

    expect(apiClient.apiRequest).toHaveBeenCalledWith("/search?q=task&type=TASK&page=1", {});
  });
});
