import { type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOfflineMutationQueue } from "../hooks/useOfflineMutationQueue";
import { listQueuedMutations } from "../model/queueStorage";

vi.mock("@state/authSession", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@state/authSession")>();
  return {
    ...actual,
    useAuthSession: () => ({
      user: { id: "user-test-100", email: "test@example.com" },
    }),
  };
});

describe("useOfflineMutationQueue hook (LOS-1313)", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    window.localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it("enqueues allowed mutations and updates reactive state", () => {
    const { result } = renderHook(
      () => useOfflineMutationQueue({ userId: "user-test-100", autoReplayOnOnline: false }),
      { wrapper },
    );

    expect(result.current.pendingCount).toBe(0);

    act(() => {
      result.current.enqueueMutation("CREATE_TASK", "/tasks", { title: "Queued Task" });
    });

    expect(result.current.pendingCount).toBe(1);
    expect(result.current.mutations[0]!.type).toBe("CREATE_TASK");
    expect(result.current.mutations[0]!.payload).toEqual({ title: "Queued Task" });

    const stored = listQueuedMutations("user-test-100");
    expect(stored).toHaveLength(1);
  });

  it("removes mutation by ID", () => {
    const { result } = renderHook(
      () => useOfflineMutationQueue({ userId: "user-test-100", autoReplayOnOnline: false }),
      { wrapper },
    );

    let id = "";
    act(() => {
      const created = result.current.enqueueMutation("CREATE_NOTE", "/notes", {
        title: "Note to remove",
      });
      if (created) id = created.id;
    });

    expect(result.current.pendingCount).toBe(1);

    act(() => {
      result.current.removeMutation(id);
    });

    expect(result.current.pendingCount).toBe(0);
    expect(listQueuedMutations("user-test-100")).toHaveLength(0);
  });

  it("clears all queued mutations for user", () => {
    const { result } = renderHook(
      () => useOfflineMutationQueue({ userId: "user-test-100", autoReplayOnOnline: false }),
      { wrapper },
    );

    act(() => {
      result.current.enqueueMutation("CREATE_TASK", "/tasks", { title: "T1" });
      result.current.enqueueMutation("CREATE_NOTE", "/notes", { title: "N1" });
    });

    expect(result.current.pendingCount).toBe(2);

    act(() => {
      result.current.clearQueue();
    });

    expect(result.current.pendingCount).toBe(0);
    expect(listQueuedMutations("user-test-100")).toHaveLength(0);
  });
});
