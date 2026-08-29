import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrainDumpRoute } from "./BrainDumpRoute";
import * as brainDumpFeature from "@features/brain-dump";
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
    useConvertBrainDumpToTask: vi.fn(),
    useConvertBrainDumpToNote: vi.fn(),
    useConvertBrainDumpToProject: vi.fn(),
    useConvertBrainDumpToGoal: vi.fn(),
  };
});

const mockUseBrainDumpItems = vi.mocked(brainDumpFeature.useBrainDumpItems);
const mockUseCaptureBrainDumpItem = vi.mocked(brainDumpFeature.useCaptureBrainDumpItem);
const mockUseDeferBrainDumpItem = vi.mocked(brainDumpFeature.useDeferBrainDumpItem);
const mockUseArchiveBrainDumpItem = vi.mocked(brainDumpFeature.useArchiveBrainDumpItem);
const mockUseRestoreBrainDumpItem = vi.mocked(brainDumpFeature.useRestoreBrainDumpItem);
const mockUseDeleteBrainDumpItem = vi.mocked(brainDumpFeature.useDeleteBrainDumpItem);
const mockUseConvertBrainDumpToTask = vi.mocked(brainDumpFeature.useConvertBrainDumpToTask);
const mockUseConvertBrainDumpToNote = vi.mocked(brainDumpFeature.useConvertBrainDumpToNote);
const mockUseConvertBrainDumpToProject = vi.mocked(brainDumpFeature.useConvertBrainDumpToProject);
const mockUseConvertBrainDumpToGoal = vi.mocked(brainDumpFeature.useConvertBrainDumpToGoal);

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
  createdAt: "2026-08-29T10:00:00Z",
  updatedAt: "2026-08-29T10:00:00Z",
};

const spyCapture = vi.fn();
const spyDefer = vi.fn();
const spyArchive = vi.fn();
const spyRestore = vi.fn();
const spyDelete = vi.fn();
const spyConvertToTask = vi.fn();
const spyConvertToNote = vi.fn();
const spyConvertToProject = vi.fn();
const spyConvertToGoal = vi.fn();

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

describe("BrainDumpRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    spyCapture.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyDefer.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyArchive.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyRestore.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyDelete.mockReset().mockResolvedValue(undefined);
    spyConvertToTask.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyConvertToNote.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyConvertToProject.mockReset().mockResolvedValue(MOCK_ITEM_1);
    spyConvertToGoal.mockReset().mockResolvedValue(MOCK_ITEM_1);

    mockUseBrainDumpItems.mockReturnValue({
      data: {
        items: [MOCK_ITEM_1],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseCaptureBrainDumpItem.mockReturnValue({
      mutateAsync: spyCapture,
      isPending: false,
    } as any);
    mockUseDeferBrainDumpItem.mockReturnValue({ mutateAsync: spyDefer, isPending: false } as any);
    mockUseArchiveBrainDumpItem.mockReturnValue({
      mutateAsync: spyArchive,
      isPending: false,
    } as any);
    mockUseRestoreBrainDumpItem.mockReturnValue({
      mutateAsync: spyRestore,
      isPending: false,
    } as any);
    mockUseDeleteBrainDumpItem.mockReturnValue({ mutateAsync: spyDelete, isPending: false } as any);
    mockUseConvertBrainDumpToTask.mockReturnValue({
      mutateAsync: spyConvertToTask,
      isPending: false,
    } as any);
    mockUseConvertBrainDumpToNote.mockReturnValue({
      mutateAsync: spyConvertToNote,
      isPending: false,
    } as any);
    mockUseConvertBrainDumpToProject.mockReturnValue({
      mutateAsync: spyConvertToProject,
      isPending: false,
    } as any);
    mockUseConvertBrainDumpToGoal.mockReturnValue({
      mutateAsync: spyConvertToGoal,
      isPending: false,
    } as any);
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

    const captureButton = screen.getByRole("button", { name: "Capture" });
    await userEvent.click(captureButton);

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

    // Click confirm
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(spyDelete).toHaveBeenCalledWith("bd-1");
  });

  it("triggers convert to task mutation when Convert to Task button is clicked", async () => {
    renderBrainDumpRoute();

    await userEvent.click(screen.getByRole("button", { name: "Convert to Task" }));

    expect(spyConvertToTask).toHaveBeenCalledWith({ id: "bd-1" });
  });

  it("triggers convert to note mutation when Convert to Note button is clicked", async () => {
    renderBrainDumpRoute();

    await userEvent.click(screen.getByRole("button", { name: "Convert to Note" }));

    expect(spyConvertToNote).toHaveBeenCalledWith({ id: "bd-1" });
  });

  it("triggers convert to project mutation when Convert to Project button is clicked", async () => {
    renderBrainDumpRoute();

    await userEvent.click(screen.getByRole("button", { name: "Convert to Project" }));

    expect(spyConvertToProject).toHaveBeenCalledWith({ id: "bd-1" });
  });

  it("triggers convert to goal mutation when Convert to Goal button is clicked", async () => {
    renderBrainDumpRoute();

    await userEvent.click(screen.getByRole("button", { name: "Convert to Goal" }));

    expect(spyConvertToGoal).toHaveBeenCalledWith({ id: "bd-1" });
  });
});
