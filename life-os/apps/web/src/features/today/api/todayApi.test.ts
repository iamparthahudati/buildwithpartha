import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";

import { getToday } from "./todayApi";

describe("todayApi", () => {
  beforeEach(() => {
    resetApiClientConfiguration();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("loads the authenticated Today aggregation through the shared API client", async () => {
    const payload = { generatedAt: "2026-08-20T04:30:00Z" };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getToday()).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith(
      "/life-os/api/v1/today",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("forwards cancellation to the request", async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getToday(controller.signal);

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
