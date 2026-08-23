import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryActivity } from "../api/activityApi";
import { activityQueryKeys, invalidateActivityQueries, useActivity } from "../hooks/useActivity";

vi.mock("../api/activityApi", () => ({ queryActivity: vi.fn() }));

const mockQueryActivity = vi.mocked(queryActivity);

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("activity query", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockQueryActivity.mockResolvedValue({
      items: [],
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it("keys and fetches a bounded subject page independently", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useActivity("TASK", "task-1", 0, 20), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQueryActivity).toHaveBeenCalledWith(
      "TASK",
      "task-1",
      0,
      20,
      expect.any(AbortSignal),
    );
    expect(activityQueryKeys.page("TASK", "task-1", 0, 20)).toEqual([
      "activity",
      "TASK",
      "task-1",
      "page",
      0,
      20,
    ]);
  });

  it("invalidates every loaded Task and Project Activity page after a mutation", async () => {
    const { queryClient } = setup();
    const taskKey = activityQueryKeys.page("TASK", "task-1", 0, 20);
    const projectKey = activityQueryKeys.page("PROJECT", "project-1", 0, 20);
    queryClient.setQueryData(taskKey, { items: [] });
    queryClient.setQueryData(projectKey, { items: [] });

    await invalidateActivityQueries(queryClient);

    expect(queryClient.getQueryState(taskKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(projectKey)?.isInvalidated).toBe(true);
  });
});
