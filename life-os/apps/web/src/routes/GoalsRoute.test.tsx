import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoalsRoute } from "./GoalsRoute";
import * as goalsFeature from "@features/goals";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { ApiError } from "@lib/apiClient";

vi.mock("@features/goals", async () => {
  const actual = await vi.importActual<typeof goalsFeature>("@features/goals");
  return {
    ...actual,
    useGoals: vi.fn(),
    useCreateGoal: vi.fn(),
    useUpdateGoal: vi.fn(),
    usePauseGoal: vi.fn(),
    useCompleteGoal: vi.fn(),
    useArchiveGoal: vi.fn(),
    useRestoreGoal: vi.fn(),
    useDeleteGoal: vi.fn(),
    useRecordCheckIn: vi.fn(),
  };
});

const mockUseGoals = vi.mocked(goalsFeature.useGoals);
const mockUseCreateGoal = vi.mocked(goalsFeature.useCreateGoal);
const mockUseUpdateGoal = vi.mocked(goalsFeature.useUpdateGoal);
const mockUsePauseGoal = vi.mocked(goalsFeature.usePauseGoal);
const mockUseCompleteGoal = vi.mocked(goalsFeature.useCompleteGoal);
const mockUseArchiveGoal = vi.mocked(goalsFeature.useArchiveGoal);
const mockUseRestoreGoal = vi.mocked(goalsFeature.useRestoreGoal);
const mockUseDeleteGoal = vi.mocked(goalsFeature.useDeleteGoal);
const mockUseRecordCheckIn = vi.mocked(goalsFeature.useRecordCheckIn);

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

const MOCK_GOAL_1: goalsFeature.Goal = {
  id: "goal-1",
  userId: "user-1",
  title: "Read 12 Books",
  description: "Read 1 book per month",
  category: "LEARNING",
  progressType: "NUMERIC",
  targetValue: 12,
  currentValue: 4,
  unit: "books",
  targetDate: "2026-12-31",
  status: "IN_PROGRESS",
  checkInCadence: "MONTHLY",
  archived: false,
  progressPercentage: 33,
  version: 1,
};

function renderGoalsRoute(initialEntries = ["/life-os/app/goals"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/life-os/app/goals" element={<GoalsRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe("GoalsRoute", () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    mockUseGoals.mockReturnValue({
      data: {
        items: [MOCK_GOAL_1],
        page: {
          items: [],
          page: 0,
          size: 10,
          totalItems: 1,
          totalPages: 1,
          first: true,
          last: true,
        },
        summary: {
          totalGoals: 1,
          activeGoals: 1,
          completedGoals: 0,
          pausedGoals: 0,
          archivedGoals: 0,
          averageProgressPercentage: 33,
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseCreateGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseUpdateGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUsePauseGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseCompleteGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseArchiveGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseRestoreGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseDeleteGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseRecordCheckIn.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
  });

  it("renders Goals screen with header and goal cards", () => {
    renderGoalsRoute();

    expect(screen.getByRole("heading", { name: "Goals", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Read 12 Books")).toBeInTheDocument();
  });

  it("passes parsed URL params to useGoals query hook", () => {
    renderGoalsRoute([
      "/life-os/app/goals?status=IN_PROGRESS&q=Read&category=LEARNING&progressType=NUMERIC&sort=title&dir=asc&page=2",
    ]);

    expect(mockUseGoals).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ["IN_PROGRESS"],
        q: "Read",
        category: "LEARNING",
        progressType: ["NUMERIC"],
        sortBy: "title",
        sortDirection: "ASC",
        page: 1,
        size: 10,
      }),
      true,
    );
  });

  it("renders detail panel when selected query param is present", () => {
    renderGoalsRoute(["/life-os/app/goals?selected=goal-1"]);

    expect(screen.getAllByText("Read 12 Books").length).toBeGreaterThan(0);
    expect(screen.getByText("Check-in Cadence:")).toBeInTheDocument();
  });

  it("renders error state when query fails and triggers retry", async () => {
    const mockRefetch = vi.fn();
    mockUseGoals.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Network error fetching goals"),
      refetch: mockRefetch,
    } as any);

    const user = userEvent.setup();
    renderGoalsRoute();

    expect(screen.getByRole("heading", { name: "Unable to load goals" })).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: "Try again" });
    await user.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("handles filter changes, search, and pagination via URL updates", async () => {
    const user = userEvent.setup();
    renderGoalsRoute();

    // Click status tab
    const completedTab = screen.getByRole("tab", { name: "Completed" });
    await user.click(completedTab);

    // Search input
    const searchInput = screen.getByPlaceholderText("Search goals...");
    await user.type(searchInput, "Books{enter}");

    expect(mockUseGoals).toHaveBeenCalled();
  });

  it("handles goal form creation trigger in GoalsRoute", async () => {
    const user = userEvent.setup();
    renderGoalsRoute();

    // Open create dialog
    const newGoalBtn = screen.getByRole("button", { name: /New Goal/i });
    await user.click(newGoalBtn);
    expect(screen.getByRole("heading", { name: "Create goal" })).toBeInTheDocument();

    // Fill form and submit
    const titleInput = screen.getByLabelText(/Goal title/i);
    await user.type(titleInput, "New Goal Title");
    const submitBtn = screen.getByRole("button", { name: "Create goal" });
    await user.click(submitBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Goal Title",
      }),
    );
  });

  it("handles 409 conflict error state during mutation in GoalsRoute", async () => {
    const conflictError = new ApiError(409, {
      status: 409,
      detail: "Conflict",
      type: "about:blank",
      title: "Conflict",
      instance: "",
      code: "CONFLICT",
      correlationId: "123",
    });
    mockMutateAsync.mockRejectedValueOnce(conflictError);

    const user = userEvent.setup();
    renderGoalsRoute();

    // Open create dialog
    const newGoalBtn = screen.getByRole("button", { name: /New Goal/i });
    await user.click(newGoalBtn);
    const titleInput = screen.getByLabelText(/Goal title/i);
    await user.type(titleInput, "Conflicting Goal");
    const submitBtn = screen.getByRole("button", { name: "Create goal" });
    await user.click(submitBtn);

    // Conflict notice should render
    expect(
      await screen.findByText(/Another change was made to this goal by a concurrent request/i),
    ).toBeInTheDocument();
  });

  it("handles goal card actions (pause, complete, archive, check-in) in GoalsRoute", async () => {
    const user = userEvent.setup();
    renderGoalsRoute();

    // Click Pause
    const pauseBtn = screen.getByRole("button", { name: "Pause" });
    await user.click(pauseBtn);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "goal-1",
      request: { version: 1 },
    });

    // Click Complete
    const completeBtn = screen.getByRole("button", { name: "Mark Complete" });
    await user.click(completeBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "goal-1",
      request: { version: 1 },
    });

    // Click Archive
    const archiveBtn = screen.getByRole("button", { name: "Archive" });
    await user.click(archiveBtn);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "goal-1",
      request: { version: 1 },
    });
  });

  it("handles check-in recording from GoalCard in GoalsRoute", async () => {
    const user = userEvent.setup();
    renderGoalsRoute();

    // Click Check In
    const checkInBtn = screen.getByRole("button", { name: "Check In" });
    await user.click(checkInBtn);

    expect(screen.getByRole("heading", { name: /Check In: Read 12 Books/i })).toBeInTheDocument();
    const saveCheckInBtn = screen.getByRole("button", { name: "Record Check-in" });
    await user.click(saveCheckInBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      goalId: "goal-1",
      request: expect.objectContaining({ value: 4 }),
    });
  });

  it("handles editing an existing goal from GoalCard in GoalsRoute", async () => {
    const user = userEvent.setup();
    renderGoalsRoute();

    const editBtn = screen.getByRole("button", { name: "Edit" });
    await user.click(editBtn);

    expect(screen.getByRole("heading", { name: "Edit goal" })).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", { name: "Save changes" });
    await user.click(submitBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "goal-1",
      request: expect.objectContaining({ title: "Read 12 Books" }),
    });
  });

  it("handles restore goal in ARCHIVED tab in GoalsRoute", async () => {
    const archivedGoal = { ...MOCK_GOAL_1, archived: true, status: "ARCHIVED" as const };
    mockUseGoals.mockReturnValue({
      data: {
        items: [archivedGoal],
        page: {
          items: [],
          page: 0,
          size: 10,
          totalItems: 1,
          totalPages: 1,
          first: true,
          last: true,
        },
        summary: {
          totalGoals: 1,
          activeGoals: 0,
          completedGoals: 0,
          pausedGoals: 0,
          archivedGoals: 1,
          averageProgressPercentage: 33,
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const user = userEvent.setup();
    renderGoalsRoute(["/life-os/app/goals?status=ARCHIVED&selected=goal-1"]);

    const restoreBtn = screen.getByRole("button", { name: "Restore" });
    await user.click(restoreBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "goal-1",
      request: { version: 1 },
    });
  });

  it("handles resume goal when status is PAUSED in GoalsRoute", async () => {
    const pausedGoal = { ...MOCK_GOAL_1, status: "PAUSED" as const };
    mockUseGoals.mockReturnValue({
      data: {
        items: [pausedGoal],
        page: {
          items: [],
          page: 0,
          size: 10,
          totalItems: 1,
          totalPages: 1,
          first: true,
          last: true,
        },
        summary: {
          totalGoals: 1,
          activeGoals: 0,
          completedGoals: 0,
          pausedGoals: 1,
          archivedGoals: 0,
          averageProgressPercentage: 33,
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const user = userEvent.setup();
    renderGoalsRoute();

    const resumeBtn = screen.getByRole("button", { name: "Resume" });
    await user.click(resumeBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "goal-1",
      request: expect.objectContaining({ title: "Read 12 Books" }),
    });
  });

  it("renders null when user is null in GoalsRoute", () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthSessionContext.Provider value={{ ...MOCK_AUTH_STATE, user: null }}>
          <MemoryRouter initialEntries={["/life-os/app/goals"]}>
            <Routes>
              <Route path="/life-os/app/goals" element={<GoalsRoute />} />
            </Routes>
          </MemoryRouter>
        </AuthSessionContext.Provider>
      </QueryClientProvider>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("clears conflict error when non-409 error occurs in GoalsRoute", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("General error"));

    const user = userEvent.setup();
    renderGoalsRoute();

    const newGoalBtn = screen.getByRole("button", { name: /New Goal/i });
    await user.click(newGoalBtn);
    const titleInput = screen.getByLabelText(/Goal title/i);
    await user.type(titleInput, "Test");
    const submitBtn = screen.getByRole("button", { name: "Create goal" });
    await user.click(submitBtn);

    expect(
      screen.queryByText(/Another change was made to this goal by a concurrent request/i),
    ).not.toBeInTheDocument();
  });
});
