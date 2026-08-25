import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoalsRoute } from "./GoalsRoute";
import * as goalsFeature from "@features/goals";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";

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
});
