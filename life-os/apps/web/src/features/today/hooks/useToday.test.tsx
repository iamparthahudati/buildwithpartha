import type { ReactNode } from "react";

import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { invalidateTodayQueries, todayQueryKey, useToday } from "./useToday";

vi.mock("../api/todayApi", () => ({
  getToday: vi.fn(() => new Promise(() => {})),
}));

describe("useToday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keys date-bound data by the confirmed account timezone", () => {
    expect(todayQueryKey("Asia/Kolkata")).toEqual(["today", "Asia/Kolkata"]);
    expect(todayQueryKey("America/New_York")).not.toEqual(todayQueryKey("Asia/Kolkata"));
  });

  it("invalidates the shared Today boundary for later domain mutations", async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();

    await invalidateTodayQueries(queryClient);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["today"] });
  });

  it("invalidates Today when the user's local date crosses midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T23:59:50.000Z"));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { unmount } = renderHook(() => useToday("UTC"), { wrapper });
    act(() => vi.advanceTimersByTime(30_000));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["today"] });
    unmount();
  });
});
