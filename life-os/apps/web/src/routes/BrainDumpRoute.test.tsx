import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrainDumpRoute } from "./BrainDumpRoute";
import * as brainDumpFeature from "@features/brain-dump";
import type { BatchConvertResult } from "@features/brain-dump";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { ToastProvider } from "@state/ToastProvider";

vi.mock("@features/brain-dump", async () => {
  const actual = await vi.importActual<typeof brainDumpFeature>("@features/brain-dump");
  return {
    ...actual,
    useBrainDumpItems: vi.fn(),
    useCaptureBrainDumpItem: vi.fn(),
    useDeferBrainDumpItem: vi.fn(),
    useArchiveBrainDumpItem: vi.fn(),
    useRestoreBrainDumpItem: vi.fn(),
    useDeleteBrainDumpItem: vi.fn(),
    useConvertBrainDumpItem: vi.fn(),
    useBrainDumpBatchConvert: vi.fn(),
    useBrainDumpCaptureQueue: vi.fn(),
  };
});

const mockUseBrainDumpItems = vi.mocked(brainDumpFeature.useBrainDumpItems);
const mockUseCaptureBrainDumpItem = vi.mocked(brainDumpFeature.useCaptureBrainDumpItem);
const mockUseDeferBrainDumpItem = vi.mocked(brainDumpFeature.useDeferBrainDumpItem);
const mockUseArchiveBrainDumpItem = vi.mocked(brainDumpFeature.useArchiveBrainDumpItem);
const mockUseRestoreBrainDumpItem = vi.mocked(brainDumpFeature.useRestoreBrainDumpItem);
const mockUseDeleteBrainDumpItem = vi.mocked(brainDumpFeature.useDeleteBrainDumpItem);
const mockUseConvertBrainDumpItem = vi.mocked(brainDumpFeature.useConvertBrainDumpItem);
const mockUseBrainDumpBatchConvert = vi.mocked(brainDumpFeature.useBrainDumpBatchConvert);
const mockUseBrainDumpCaptureQueue = vi.mocked(brainDumpFeature.useBrainDumpCaptureQueue);

const MOCK_USER = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  timeZone: "UTC",
  locale: "en-US",
  weekStart: 1,
};

const MOCK_AUTH_STATE: AuthSessionValue = {
  user: MOCK_USER,
  csrfToken: "mock-csrf-token",
  isBootstrapping: false,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

const MOCK_ITEM_1: brainDumpFeature.BrainDumpItem = {
  id: "bd-1",
  userId: "user-1",
  content: "Buy groceries and write tests",
  status: "UNPROCESSED",
  archived: false,
  version: 0,
  convertedToType: null,
  convertedToId: null,
  convertedAt: null,
  archivedAt: null,
  createdAt: "2026-08-29T10:00:00Z",
  updatedAt: "2026-08-29T10:00:00Z",
};

const CONVERTED_TASK: brainDumpFeature.BrainDumpItem = {
  ...MOCK_ITEM_1,
  status: "CONVERTED",
  convertedToType: "TASK",
  convertedToId: "task-42",
  convertedAt: "2026-08-29T11:00:00Z",
};

const spyCapture = vi.fn();
const spyDefer = vi.fn();
const spyArchive = vi.fn();
const spyRestore = vi.fn();
const spyDelete = vi.fn();
const spyConvert = vi.fn();
const spyBatch = vi.fn();
const spyBatchReset = vi.fn();
const spyEnqueue = vi.fn();
const spyFlush = vi.fn();
const spyDiscardAll = vi.fn();

function setQueueState(
  overrides: Partial<ReturnType<typeof brainDumpFeature.useBrainDumpCaptureQueue>> = {},
) {
  const queuedItems = overrides.queuedItems ?? [];
  mockUseBrainDumpCaptureQueue.mockReturnValue({
    queuedItems,
    queuedCount: queuedItems.length,
    isFlushing: false,
    enqueue: spyEnqueue,
    flush: spyFlush,
    discardAll: spyDiscardAll,
    ...overrides,
  });
}

function renderBrainDumpRoute(initialEntries = ["/life-os/app/brain-dump"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/life-os/app/brain-dump" element={<BrainDumpRoute />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthSessionContext.Provider>
    </QueryClientProvider>,
  );
}

function setBatchState(data: BatchConvertResult | undefined = undefined, isPending = false) {
  mockUseBrainDumpBatchConvert.mockReturnValue({
    mutateAsync: spyBatch,
    mutate: spyBatch,
    reset: spyBatchReset,
    data,
    isPending,
  } as never);
}

describe("BrainDumpRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    spyCapture.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyDefer.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyArchive.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyRestore.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyDelete.mockReset().mockResolvedValue(undefined);
    spyConvert.mockReset().mockResolvedValue(CONVERTED_TASK);
    spyBatch.mockReset().mockResolvedValue({
      target: "TASK",
      results: [{ id: "bd-1", content: MOCK_ITEM_1.content, ok: true, item: CONVERTED_TASK }],
      successCount: 1,
      failureCount: 0,
    } satisfies BatchConvertResult);
    spyBatchReset.mockReset();
    spyEnqueue.mockReset();
    spyFlush.mockReset().mockResolvedValue({ sent: 0, remaining: 0 });
    spyDiscardAll.mockReset();

    mockUseBrainDumpItems.mockReturnValue({
      data: { items: [MOCK_ITEM_1], page: 0, size: 20, totalItems: 1, totalPages: 1 },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    mockUseCaptureBrainDumpItem.mockReturnValue({
      mutateAsync: spyCapture,
      isPending: false,
    } as never);
    mockUseDeferBrainDumpItem.mockReturnValue({ mutateAsync: spyDefer, isPending: false } as never);
    mockUseArchiveBrainDumpItem.mockReturnValue({
      mutateAsync: spyArchive,
      isPending: false,
    } as never);
    mockUseRestoreBrainDumpItem.mockReturnValue({
      mutateAsync: spyRestore,
      isPending: false,
    } as never);
    mockUseDeleteBrainDumpItem.mockReturnValue({
      mutateAsync: spyDelete,
      isPending: false,
    } as never);
    mockUseConvertBrainDumpItem.mockReturnValue({
      mutateAsync: spyConvert,
      isPending: false,
    } as never);
    setBatchState();
    setQueueState();
  });

  it("renders brain dump screen correctly", () => {
    renderBrainDumpRoute();

    expect(screen.getByText("Buy groceries and write tests")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "What is on your mind?" })).toBeInTheDocument();
  });

  it("handles capturing new brain dump item", async () => {
    renderBrainDumpRoute();

    const textarea = screen.getByRole("textbox", { name: "What is on your mind?" });
    await userEvent.type(textarea, "Learn React Query");

    await userEvent.click(screen.getByRole("button", { name: "Capture" }));

    expect(spyCapture).toHaveBeenCalledWith({ content: "Learn React Query" });
    await waitFor(() => {
      expect(screen.getByText("Brain Dump item captured.")).toBeInTheDocument();
    });
  });

  it("triggers defer mutation when defer button is clicked", async () => {
    renderBrainDumpRoute();

    await userEvent.click(screen.getByRole("button", { name: "Defer item" }));

    expect(spyDefer).toHaveBeenCalledWith({ id: "bd-1", version: 0 });
  });

  it("triggers archive mutation when archive button is clicked", async () => {
    renderBrainDumpRoute();

    await userEvent.click(screen.getByRole("button", { name: "Archive item" }));

    expect(spyArchive).toHaveBeenCalledWith({ id: "bd-1", version: 0 });
  });

  it("triggers delete mutation when delete is confirmed", async () => {
    renderBrainDumpRoute();

    await userEvent.click(screen.getByRole("button", { name: "Delete item" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(spyDelete).toHaveBeenCalledWith("bd-1");
  });

  it("opens the conversion dialog and submits a full task payload", async () => {
    renderBrainDumpRoute();

    await userEvent.click(screen.getByRole("button", { name: "Convert to Task" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Convert to Task" }));

    expect(spyConvert).toHaveBeenCalledTimes(1);
    expect(spyConvert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "bd-1",
        target: "TASK",
        request: expect.objectContaining({
          title: "Buy groceries and write tests",
          priority: "P3",
          version: 0,
        }),
      }),
    );
  });

  it("shows the transactional result link after a conversion resolves", async () => {
    renderBrainDumpRoute();

    await userEvent.click(screen.getByRole("button", { name: "Convert to Task" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Convert to Task" }));

    const link = await screen.findByRole("link", { name: /Open the new Task/i });
    expect(link).toHaveAttribute("href", "/life-os/app/tasks/task-42");
  });

  it("batch-converts selected items", async () => {
    renderBrainDumpRoute();

    await userEvent.click(screen.getByRole("checkbox", { name: /Select item/i }));

    const region = screen.getByRole("region", { name: "Batch conversion" });
    await userEvent.click(within(region).getByRole("button", { name: /Convert to Task/i }));

    expect(spyBatch).toHaveBeenCalledWith({
      items: [expect.objectContaining({ id: "bd-1" })],
      target: "TASK",
    });
  });

  it("renders partial batch results with a retry for failures", async () => {
    setBatchState({
      target: "NOTE",
      results: [
        {
          id: "bd-1",
          content: "ok item",
          ok: true,
          item: { ...CONVERTED_TASK, convertedToType: "NOTE", convertedToId: "note-1" },
        },
        { id: "bd-2", content: "bad item", ok: false, error: "Conversion failed." },
      ],
      successCount: 1,
      failureCount: 1,
    });

    renderBrainDumpRoute();

    expect(screen.getByText(/Converted 1 of 2 to Note/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry 1 failed/i })).toBeInTheDocument();
  });

  describe("offline capture queue (LOS-1207)", () => {
    const originalOnLine = window.navigator.onLine;

    afterEach(() => {
      Object.defineProperty(window.navigator, "onLine", {
        value: originalOnLine,
        configurable: true,
      });
    });

    it("queues a capture instead of sending it while offline", async () => {
      Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
      renderBrainDumpRoute();

      const textarea = screen.getByRole("textbox", { name: "What is on your mind?" });
      await userEvent.type(textarea, "Offline idea");
      await userEvent.click(screen.getByRole("button", { name: "Queue item" }));

      expect(spyEnqueue).toHaveBeenCalledWith("Offline idea");
      expect(spyCapture).not.toHaveBeenCalled();
    });

    it("shows the sync banner and flushes on demand", async () => {
      spyFlush.mockResolvedValue({ sent: 1, remaining: 0 });
      setQueueState({
        queuedItems: [{ id: "q1", content: "waiting thought", queuedAt: "2026-08-30T10:00:00Z" }],
      });
      renderBrainDumpRoute();

      expect(screen.getByText(/1 capture waiting to sync/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Sync now" }));
      await waitFor(() => expect(spyFlush).toHaveBeenCalled());
    });

    it("discards queued captures", async () => {
      setQueueState({
        queuedItems: [{ id: "q1", content: "waiting thought", queuedAt: "2026-08-30T10:00:00Z" }],
      });
      renderBrainDumpRoute();

      await userEvent.click(screen.getByRole("button", { name: "Discard" }));
      expect(spyDiscardAll).toHaveBeenCalled();
    });
  });
});
