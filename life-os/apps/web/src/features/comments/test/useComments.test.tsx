import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createComment, deleteComment, queryComments, updateComment } from "../api/commentsApi";
import { commentsQueryKeys, useCommentMutations, useComments } from "../hooks/useComments";

vi.mock("../api/commentsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/commentsApi")>();
  return {
    ...actual,
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    queryComments: vi.fn(),
    updateComment: vi.fn(),
  };
});

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("comment hooks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(queryComments).mockResolvedValue({
      items: [],
      page: 2,
      pageSize: 20,
      total: 21,
      totalPages: 2,
    });
  });

  it("keys and fetches each bounded parent page independently", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useComments("PROJECT", "project-1", 2, 20), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryComments).toHaveBeenCalledWith(
      "PROJECT",
      "project-1",
      2,
      20,
      expect.any(AbortSignal),
    );
    expect(result.current.data?.total).toBe(21);
  });

  it("runs create/edit/delete with versions and refreshes every page for that parent", async () => {
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    vi.mocked(createComment).mockResolvedValue({} as never);
    vi.mocked(updateComment).mockResolvedValue({} as never);
    vi.mocked(deleteComment).mockResolvedValue(undefined);
    const { result } = renderHook(() => useCommentMutations("TASK", "task-1"), { wrapper });

    await act(async () => {
      await result.current.add.mutateAsync("First comment");
      await result.current.edit.mutateAsync({ id: "comment-1", body: "Revised", version: 3 });
      await result.current.remove.mutateAsync({ id: "comment-1", version: 4 });
    });

    expect(createComment).toHaveBeenCalledWith("TASK", "task-1", "First comment");
    expect(updateComment).toHaveBeenCalledWith("TASK", "task-1", "comment-1", "Revised", 3);
    expect(deleteComment).toHaveBeenCalledWith("TASK", "task-1", "comment-1", 4);
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenLastCalledWith({
      queryKey: commentsQueryKeys.parent("TASK", "task-1"),
    });
  });
});
