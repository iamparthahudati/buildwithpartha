import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimeBlocksRoute } from "./TimeBlocksRoute";
import * as timeBlocksFeature from "@features/time-blocks";
import * as projectsFeature from "@features/projects";
import * as tasksFeature from "@features/tasks";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { ToastProvider } from "@state/ToastProvider";

vi.mock("@features/time-blocks", async () => {
  const actual = await vi.importActual<typeof timeBlocksFeature>("@features/time-blocks");
  return {
    ...actual,
    useTimeBlocks: vi.fn(),
    useDailyTimeSummary: vi.fn(),
    useCreateTimeBlock: vi.fn(),
    useUpdateTimeBlock: vi.fn(),
    useMoveTimeBlock: vi.fn(),
    useResizeTimeBlock: vi.fn(),
    useCompleteTimeBlock: vi.fn(),
    useDuplicateTimeBlock: vi.fn(),
    useDeleteTimeBlock: vi.fn(),
    useCheckTimeBlockOverlap: vi.fn(),
  };
});

vi.mock("@features/projects", async () => {
  const actual = await vi.importActual<typeof projectsFeature>("@features/projects");
  return {
    ...actual,
    useProjects: vi.fn(),
  };
});

vi.mock("@features/tasks", async () => {
  const actual = await vi.importActual<typeof tasksFeature>("@features/tasks");
  return {
    ...actual,
    useTasks: vi.fn(),
    useTaskDetail: vi.fn(),
  };
});

const mockUseTimeBlocks = vi.mocked(timeBlocksFeature.useTimeBlocks);
const mockUseDailyTimeSummary = vi.mocked(timeBlocksFeature.useDailyTimeSummary);
const mockUseCreateTimeBlock = vi.mocked(timeBlocksFeature.useCreateTimeBlock);
const mockUseUpdateTimeBlock = vi.mocked(timeBlocksFeature.useUpdateTimeBlock);
const mockUseMoveTimeBlock = vi.mocked(timeBlocksFeature.useMoveTimeBlock);
const mockUseResizeTimeBlock = vi.mocked(timeBlocksFeature.useResizeTimeBlock);
const mockUseCompleteTimeBlock = vi.mocked(timeBlocksFeature.useCompleteTimeBlock);
const mockUseDuplicateTimeBlock = vi.mocked(timeBlocksFeature.useDuplicateTimeBlock);
const mockUseDeleteTimeBlock = vi.mocked(timeBlocksFeature.useDeleteTimeBlock);
const mockUseCheckTimeBlockOverlap = vi.mocked(timeBlocksFeature.useCheckTimeBlockOverlap);
const mockUseProjects = vi.mocked(projectsFeature.useProjects);
const mockUseTasks = vi.mocked(tasksFeature.useTasks);
const mockUseTaskDetail = vi.mocked(tasksFeature.useTaskDetail);

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

const MOCK_BLOCK: timeBlocksFeature.TimeBlock = {
  id: "tb-101",
  title: "Integrated Time Block",
  category: "Focus",
  status: "SCHEDULED",
  date: "2026-08-24",
  startTime: "09:00",
  endTime: "11:00",
  timeZone: "UTC",
  version: 1,
};

const MOCK_TASK = {
  id: "task-1",
  title: "Schedule the gate walkthrough",
};

const MOCK_SUMMARY: timeBlocksFeature.DailyTimeSummaryDto = {
  generatedAt: "2026-08-24T12:00:00Z",
  localDate: "2026-08-24",
  timeZone: "UTC",
  actualFocusMinutes: 45,
  actualBreakMinutes: 5,
  unscheduledFocusMinutes: 15,
  personalTimeBlockMinutes: 30,
  plannedFocusMinutes: 120,
  dailyFocusTargetMinutes: 90,
  comparisonMinutes: 120,
  comparisonSource: "PLANNED_FOCUS_BLOCKS",
  progressPercentage: 38,
  sessionActive: false,
  activeSessionTimerSummary: null,
  categories: [{ category: "Focus", minutes: 120 }],
  hasData: true,
};

function renderTimeBlocksRoute(initialEntries = ["/life-os/app/time-blocks?date=2026-08-24"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/life-os/app/time-blocks" element={<TimeBlocksRoute />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthSessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe("TimeBlocksRoute", () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    mockUseTimeBlocks.mockReturnValue({
      data: {
        items: [MOCK_BLOCK],
        totalCount: 1,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseDailyTimeSummary.mockReturnValue({
      data: MOCK_SUMMARY,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseProjects.mockReturnValue({
      data: { items: [], summary: { total: 0 } },
      isPending: false,
    } as any);

    mockUseTasks.mockReturnValue({
      data: { items: [MOCK_TASK], summary: { total: 1 } },
      isPending: false,
    } as any);

    mockUseTaskDetail.mockReturnValue({ data: undefined, isPending: false } as any);

    mockUseCreateTimeBlock.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseUpdateTimeBlock.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseMoveTimeBlock.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseResizeTimeBlock.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseCompleteTimeBlock.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseDuplicateTimeBlock.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseDeleteTimeBlock.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseCheckTimeBlockOverlap.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ hasConflict: false, conflictingBlocks: [] }),
      isPending: false,
    } as any);
  });

  it("renders Time Blocks screen with header and fetched blocks", () => {
    renderTimeBlocksRoute();

    expect(screen.getByRole("heading", { name: "Time Blocks" })).toBeInTheDocument();
    expect(screen.getAllByText("Integrated Time Block")[0]).toBeInTheDocument();
  });

  it("passes date parameter from URL to query hook", () => {
    renderTimeBlocksRoute(["/life-os/app/time-blocks?date=2026-08-25"]);

    expect(mockUseTimeBlocks).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-08-25",
        timeZone: "UTC",
      }),
      true,
    );
    expect(mockUseDailyTimeSummary).toHaveBeenCalledWith("2026-08-25", "UTC", true);
  });

  it("renders the server time summary with its labelled denominator", () => {
    renderTimeBlocksRoute();

    expect(screen.getAllByText("45 min")).toHaveLength(2);
    expect(screen.getByText("of 2 hr planned focus")).toBeInTheDocument();
  });

  it("opens a Calendar-linked Time Block as the true editable record", async () => {
    renderTimeBlocksRoute(["/life-os/app/time-blocks?date=2026-08-24&selected=tb-101"]);

    expect(await screen.findByRole("heading", { name: "Edit time block" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Integrated Time Block")).toBeInTheDocument();
  });

  it("opens a Task scheduling deep link with the canonical Task selected", async () => {
    renderTimeBlocksRoute(["/life-os/app/time-blocks?date=2026-08-24&taskId=task-1"]);

    expect(await screen.findByRole("heading", { name: "Create time block" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Linked Task/ })).toHaveValue("task-1");
  });

  it("fetches a deep-linked Task that is outside the loaded Tasks page", async () => {
    mockUseTasks.mockReturnValue({
      data: { items: [], summary: { total: 101 } },
      isPending: false,
    } as any);
    mockUseTaskDetail.mockReturnValue({
      data: { task: MOCK_TASK },
      isPending: false,
    } as any);

    renderTimeBlocksRoute(["/life-os/app/time-blocks?date=2026-08-24&taskId=task-1"]);

    expect(mockUseTaskDetail).toHaveBeenCalledWith("task-1", true);
    expect(await screen.findByRole("heading", { name: "Create time block" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Linked Task/ })).toHaveValue("task-1");
  });

  it("detects a conflict before create and permits an explicit override", async () => {
    const overlap = vi
      .fn()
      .mockResolvedValueOnce({
        hasConflict: true,
        conflictingBlocks: [{ title: "Existing focus block" }],
      })
      .mockResolvedValue({ hasConflict: false, conflictingBlocks: [] });
    mockUseCheckTimeBlockOverlap.mockReturnValue({ mutateAsync: overlap, isPending: false } as any);

    const user = userEvent.setup();
    renderTimeBlocksRoute();
    await user.click(screen.getAllByRole("button", { name: "Add block" })[0]!);
    await user.type(screen.getByRole("textbox", { name: /title/i }), "Gate walkthrough");
    await user.click(screen.getByRole("button", { name: "Create time block" }));

    expect(await screen.findByText("Overlaps with Existing focus block.")).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: "Allow scheduling despite conflict" }));
    await user.click(screen.getByRole("button", { name: "Create time block" }));

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Gate walkthrough", allowOverlap: true }),
    );
  });

  it("updates URL and triggers queries when Next Day button is clicked", async () => {
    const user = userEvent.setup();
    renderTimeBlocksRoute(["/life-os/app/time-blocks?date=2026-08-24"]);

    const nextBtn = screen.getByRole("button", { name: "Next day" });
    await user.click(nextBtn);

    await waitFor(() => {
      expect(mockUseTimeBlocks).toHaveBeenCalledWith(
        expect.objectContaining({
          date: "2026-08-25",
          timeZone: "UTC",
        }),
        true,
      );
    });
  });

  it("triggers complete mutation when block completion action is clicked", async () => {
    const user = userEvent.setup();
    renderTimeBlocksRoute();

    const menuTriggers = screen.getAllByRole("button", { name: "Block menu" });
    await user.click(menuTriggers[0]!);

    const completeMenuItem = screen.getByRole("menuitem", { name: "Complete" });
    await user.click(completeMenuItem);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "tb-101",
      version: 1,
    });
  });

  it("renders error state when query fails and allows retry", async () => {
    const mockRefetch = vi.fn();
    mockUseTimeBlocks.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Network error loading time blocks"),
      refetch: mockRefetch,
    } as any);

    const user = userEvent.setup();
    renderTimeBlocksRoute();

    expect(screen.getByText("Failed to load time blocks")).toBeInTheDocument();
    expect(screen.getByText("Network error loading time blocks")).toBeInTheDocument();
    expect(screen.queryByText("Morning Review & Daily Plan")).not.toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    await user.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalled();
  });
});
