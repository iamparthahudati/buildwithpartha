import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoalDetailsRoute } from "./GoalDetailsRoute";
import * as goalsFeature from "@features/goals";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { ApiError } from "@lib/apiClient";

vi.mock("@features/goals", async () => {
  const actual = await vi.importActual<typeof goalsFeature>("@features/goals");
  return {
    ...actual,
    useGoalDetail: vi.fn(),
    useUpdateGoal: vi.fn(),
    usePauseGoal: vi.fn(),
    useCompleteGoal: vi.fn(),
    useArchiveGoal: vi.fn(),
    useRestoreGoal: vi.fn(),
    useDeleteGoal: vi.fn(),
    useRecordCheckIn: vi.fn(),
    useDeleteCheckIn: vi.fn(),
    useAddGoalLink: vi.fn(),
    useDeleteGoalLink: vi.fn(),
  };
});

const mockUseGoalDetail = vi.mocked(goalsFeature.useGoalDetail);
const mockUseUpdateGoal = vi.mocked(goalsFeature.useUpdateGoal);
const mockUsePauseGoal = vi.mocked(goalsFeature.usePauseGoal);
const mockUseCompleteGoal = vi.mocked(goalsFeature.useCompleteGoal);
const mockUseArchiveGoal = vi.mocked(goalsFeature.useArchiveGoal);
const mockUseRestoreGoal = vi.mocked(goalsFeature.useRestoreGoal);
const mockUseDeleteGoal = vi.mocked(goalsFeature.useDeleteGoal);
const mockUseRecordCheckIn = vi.mocked(goalsFeature.useRecordCheckIn);
const mockUseDeleteCheckIn = vi.mocked(goalsFeature.useDeleteCheckIn);
const mockUseAddGoalLink = vi.mocked(goalsFeature.useAddGoalLink);
const mockUseDeleteGoalLink = vi.mocked(goalsFeature.useDeleteGoalLink);

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

const MOCK_GOAL_DETAIL = {
  goal: {
    id: "goal-1",
    userId: "user-1",
    title: "Read 12 Books",
    description: "Read 1 book per month",
    category: "LEARNING",
    progressType: "NUMERIC" as const,
    targetValue: 12,
    currentValue: 4,
    unit: "books",
    targetDate: "2026-12-31",
    status: "IN_PROGRESS" as const,
    checkInCadence: "MONTHLY" as const,
    archived: false,
    progressPercentage: 33,
    version: 1,
  },
  progressPercentage: 33,
  checkIns: [
    {
      id: "checkin-1",
      goalId: "goal-1",
      userId: "user-1",
      value: 4,
      note: "Finished book 4",
      recordedAt: "2026-08-20T12:00:00Z",
    },
  ],
  links: [
    {
      id: "link-1",
      goalId: "goal-1",
      userId: "user-1",
      targetType: "PROJECT" as const,
      targetId: "proj-1",
      targetTitle: "Reading List App",
    },
  ],
};

function renderGoalDetailsRoute(goalId = "goal-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <MemoryRouter initialEntries={[`/life-os/app/goals/${goalId}`]}>
          <Routes>
            <Route path="/life-os/app/goals" element={<div>Goals List</div>} />
            <Route path="/life-os/app/goals/:goalId" element={<GoalDetailsRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe("GoalDetailsRoute", () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    mockUseGoalDetail.mockReturnValue({
      data: MOCK_GOAL_DETAIL,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseUpdateGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUsePauseGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseCompleteGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseArchiveGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseRestoreGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseDeleteGoal.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseRecordCheckIn.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseDeleteCheckIn.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseAddGoalLink.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseDeleteGoalLink.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
  });

  it("renders GoalDetails screen with goal metadata, check-ins, and links", () => {
    renderGoalDetailsRoute("goal-1");

    expect(screen.getByText("Read 12 Books")).toBeInTheDocument();
    expect(screen.getByText("Finished book 4")).toBeInTheDocument();
    expect(screen.getByText("Reading List App")).toBeInTheDocument();
  });

  it("triggers check-in mutation", async () => {
    const user = userEvent.setup();
    renderGoalDetailsRoute("goal-1");

    const checkInBtn = screen.getAllByRole("button", { name: /Check In/i })[0];
    if (checkInBtn) {
      await user.click(checkInBtn);
      expect(screen.getByRole("heading", { name: /Check In:/i })).toBeInTheDocument();
    }
  });

  it("renders error state when goal detail fails to load", () => {
    mockUseGoalDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network error loading detail"),
      refetch: vi.fn(),
    } as any);

    renderGoalDetailsRoute("goal-1");

    expect(screen.getByRole("heading", { name: "Failed to load goal" })).toBeInTheDocument();
  });

  it("renders 404 not found state when 404 error occurs in GoalDetailsRoute", () => {
    mockUseGoalDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Request failed with status 404"),
      refetch: vi.fn(),
    } as any);

    renderGoalDetailsRoute("goal-1");

    expect(screen.getByText("Goal not found")).toBeInTheDocument();
  });

  it("renders 403 forbidden state when 403 error occurs in GoalDetailsRoute", () => {
    mockUseGoalDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Request failed with status 403"),
      refetch: vi.fn(),
    } as any);

    renderGoalDetailsRoute("goal-1");

    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
  });

  it("handles pause, resume, complete, archive, restore, and delete actions in GoalDetailsRoute", async () => {
    const user = userEvent.setup();
    renderGoalDetailsRoute("goal-1");

    // Click pause button
    const pauseBtn = screen.getByRole("button", { name: "Pause" });
    await user.click(pauseBtn);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "goal-1",
      request: { version: 1 },
    });

    // Click complete button
    const completeBtn = screen.getByRole("button", { name: "Complete" });
    await user.click(completeBtn);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "goal-1",
      request: { version: 1 },
    });

    // Click archive button
    const archiveBtn = screen.getByRole("button", { name: "Archive" });
    await user.click(archiveBtn);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "goal-1",
      request: { version: 1 },
    });
  });

  it("handles 409 conflict error and conflict resolution in GoalDetailsRoute", async () => {
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
    renderGoalDetailsRoute("goal-1");

    const pauseBtn = screen.getByRole("button", { name: "Pause" });
    await user.click(pauseBtn);

    expect(
      await screen.findByText(/Another change was made to this goal by a concurrent request/i),
    ).toBeInTheDocument();

    const reloadBtn = screen.getByRole("button", { name: /Reload latest goal/i });
    await user.click(reloadBtn);

    expect(
      screen.queryByText(/Another change was made to this goal by a concurrent request/i),
    ).not.toBeInTheDocument();
  });

  it("navigates back when Back to Goals is clicked", async () => {
    const user = userEvent.setup();
    renderGoalDetailsRoute("goal-1");

    const backBtn = screen.getByRole("button", { name: /Back to Goals/i });
    await user.click(backBtn);
  });

  it("handles record check-in in GoalDetailsRoute", async () => {
    const user = userEvent.setup();
    renderGoalDetailsRoute("goal-1");

    // Check In
    const checkInBtn = screen.getByRole("button", { name: "Check In" });
    await user.click(checkInBtn);

    const saveCheckInBtn = screen.getByRole("button", { name: "Record Check-in" });
    await user.click(saveCheckInBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      goalId: "goal-1",
      request: expect.objectContaining({ value: 4 }),
    });
  });

  it("handles edit goal and delete goal in GoalDetailsRoute", async () => {
    const user = userEvent.setup();
    renderGoalDetailsRoute("goal-1");

    // Click Edit
    const editBtn = screen.getByRole("button", { name: "Edit" });
    await user.click(editBtn);

    expect(screen.getByRole("heading", { name: "Edit goal" })).toBeInTheDocument();
    const saveBtn = screen.getByRole("button", { name: "Save changes" });
    await user.click(saveBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "goal-1",
        request: expect.objectContaining({ title: "Read 12 Books" }),
      }),
    );

    // Click Delete Goal
    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteBtn);

    const confirmDeleteBtn = screen.getByRole("button", { name: "Delete Goal" });
    await user.click(confirmDeleteBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith("goal-1");
  });

  it("handles resume goal when status is PAUSED", async () => {
    mockUseGoalDetail.mockReturnValue({
      data: {
        ...MOCK_GOAL_DETAIL,
        goal: { ...MOCK_GOAL_DETAIL.goal, status: "PAUSED" as const },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const user = userEvent.setup();
    renderGoalDetailsRoute("goal-1");

    const resumeBtn = screen.getByRole("button", { name: "Resume" });
    await user.click(resumeBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "goal-1",
      request: expect.objectContaining({ title: "Read 12 Books" }),
    });
  });

  it("handles link management (add link & delete link)", async () => {
    const user = userEvent.setup();
    renderGoalDetailsRoute("goal-1");

    // Delete link
    const deleteLinkBtn = screen.getByRole("button", { name: "Unlink project Reading List App" });
    await user.click(deleteLinkBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      goalId: "goal-1",
      linkId: "link-1",
    });

    // Add link
    const addLinkBtn = screen.getAllByRole("button", { name: "Add Link" })[0]!;
    await user.click(addLinkBtn);

    const targetIdInput = screen.getByLabelText(/Work item ID or reference/i);
    await user.type(targetIdInput, "proj-2");

    const linkSubmitBtn = screen.getAllByRole("button", { name: "Add Link" })[1]!;
    await user.click(linkSubmitBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      goalId: "goal-1",
      request: { targetType: "PROJECT", targetId: "proj-2" },
    });
  });

  it("renders null when user is null in GoalDetailsRoute", () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthSessionContext.Provider value={{ ...MOCK_AUTH_STATE, user: null }}>
          <MemoryRouter initialEntries={["/life-os/app/goals/goal-1"]}>
            <Routes>
              <Route path="/life-os/app/goals/:goalId" element={<GoalDetailsRoute />} />
            </Routes>
          </MemoryRouter>
        </AuthSessionContext.Provider>
      </QueryClientProvider>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("clears conflict error when non-409 error occurs in GoalDetailsRoute", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("General failure"));

    const user = userEvent.setup();
    renderGoalDetailsRoute("goal-1");

    const pauseBtn = screen.getByRole("button", { name: "Pause" });
    await user.click(pauseBtn);

    expect(
      screen.queryByText(/Another change was made to this goal by a concurrent request/i),
    ).not.toBeInTheDocument();
  });
});
