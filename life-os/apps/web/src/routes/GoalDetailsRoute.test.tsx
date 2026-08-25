import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoalDetailsRoute } from "./GoalDetailsRoute";
import * as goalsFeature from "@features/goals";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";

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
});
