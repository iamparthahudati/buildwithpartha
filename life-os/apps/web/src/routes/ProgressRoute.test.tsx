import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProgressRoute } from "./ProgressRoute";
import * as progressFeature from "@features/progress";
import * as projectsFeature from "@features/projects";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";

vi.mock("@features/progress", async () => {
  const actual = await vi.importActual<typeof progressFeature>("@features/progress");
  return {
    ...actual,
    useProgressReport: vi.fn(),
  };
});

vi.mock("@features/projects", async () => {
  const actual = await vi.importActual<typeof projectsFeature>("@features/projects");
  return {
    ...actual,
    useProjects: vi.fn(),
  };
});

const mockUseProgressReport = vi.mocked(progressFeature.useProgressReport);
const mockUseProjects = vi.mocked(projectsFeature.useProjects);

const MOCK_USER = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  timeZone: "Asia/Kolkata",
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

const MOCK_REPORT: progressFeature.ProgressReport = {
  metricDictionaryVersion: "1.0.0",
  generatedAt: "2026-08-27T00:00:00Z",
  timeZone: "Asia/Kolkata",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  taskProgress: {
    totalCount: 20,
    completedCount: 15,
    dueCount: 3,
    overdueCount: 1,
    highPriorityCount: 2,
    blockedCount: 0,
    completionRatePercentage: 75.0,
  },
  focusProgress: {
    plannedFocusMinutes: 600,
    actualFocusMinutes: 500,
    actualBreakMinutes: 90,
    comparisonMinutes: 600,
    comparisonSource: "PLANNED_BLOCKS",
    plannedVsActualRatio: 83.3,
    categoryBreakdown: [
      { category: "Engineering", actualMinutes: 350, percentage: 70.0 },
      { category: "Product", actualMinutes: 150, percentage: 30.0 },
    ],
  },
  projectProgress: {
    totalCount: 4,
    statusCounts: { IN_PROGRESS: 3, COMPLETED: 1 },
    averageProgressPercentage: 80.0,
  },
  goalProgress: {
    totalCount: 3,
    averageProgressPercentage: 90.0,
    goalsWithRecentCheckinCount: 3,
  },
  habitProgress: {
    totalCount: 5,
    completionRatePercentage: 80.0,
  },
  reviewProgress: {
    dailyStreakDays: 10,
    finalizedReviewsCount: 20,
  },
  summaryText: "Completed 15 tasks and 500 focus minutes.",
};

const EMPTY_REPORT: progressFeature.ProgressReport = {
  metricDictionaryVersion: "1.0.0",
  generatedAt: "2026-08-27T00:00:00Z",
  timeZone: "Asia/Kolkata",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  taskProgress: {
    totalCount: 0,
    completedCount: 0,
    dueCount: 0,
    overdueCount: 0,
    highPriorityCount: 0,
    blockedCount: 0,
    completionRatePercentage: null,
  },
  focusProgress: {
    plannedFocusMinutes: 0,
    actualFocusMinutes: 0,
    actualBreakMinutes: 0,
    comparisonMinutes: null,
    comparisonSource: "NONE",
    plannedVsActualRatio: null,
    categoryBreakdown: [],
  },
  projectProgress: {
    totalCount: 0,
    statusCounts: {},
    averageProgressPercentage: null,
  },
  goalProgress: {
    totalCount: 0,
    averageProgressPercentage: null,
    goalsWithRecentCheckinCount: 0,
  },
  habitProgress: {
    totalCount: 0,
    completionRatePercentage: null,
  },
  reviewProgress: {
    dailyStreakDays: 0,
    finalizedReviewsCount: 0,
  },
  summaryText: "No activity recorded.",
};

function renderProgressRoute(initialEntries = ["/life-os/app/progress"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/life-os/app/progress" element={<ProgressRoute />} />
            <Route path="/life-os/app/reports" element={<div>Reports Screen</div>} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe("ProgressRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjects.mockReturnValue({
      data: { items: [{ id: "p-1", name: "Alpha Project" }], page: null, summary: null },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjects>);
  });

  it("calls useProgressReport with derived default filter params", () => {
    mockUseProgressReport.mockReturnValue({
      data: MOCK_REPORT,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof progressFeature.useProgressReport>);

    renderProgressRoute();

    expect(screen.getByRole("heading", { name: "Progress & Insights" })).toBeInTheDocument();
    expect(mockUseProgressReport).toHaveBeenCalledWith(
      expect.objectContaining({
        periodPreset: "THIS_MONTH",
        timeZone: "Asia/Kolkata",
      }),
      true,
    );
  });

  it("parses URL search parameters correctly", () => {
    mockUseProgressReport.mockReturnValue({
      data: MOCK_REPORT,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof progressFeature.useProgressReport>);

    renderProgressRoute([
      "/life-os/app/progress?preset=THIS_WEEK&startDate=2026-08-01&endDate=2026-08-07&projectId=p-1&category=Engineering",
    ]);

    expect(mockUseProgressReport).toHaveBeenCalledWith(
      expect.objectContaining({
        periodPreset: "THIS_WEEK",
        startDate: "2026-08-01",
        endDate: "2026-08-07",
        projectId: "p-1",
        category: "Engineering",
        timeZone: "Asia/Kolkata",
      }),
      true,
    );
  });

  it("renders loading skeleton when progress report query is pending", () => {
    mockUseProgressReport.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof progressFeature.useProgressReport>);

    renderProgressRoute();

    expect(screen.getByTestId("progress-skeleton")).toBeInTheDocument();
  });

  it("renders error state and handles retry", async () => {
    const mockRefetch = vi.fn();
    mockUseProgressReport.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Network error fetching report"),
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof progressFeature.useProgressReport>);

    renderProgressRoute();

    expect(screen.getByText("Unable to load progress data")).toBeInTheDocument();

    const user = userEvent.setup();
    const retryBtn = screen.getByRole("button", { name: "Try again" });
    await user.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("renders summary cards and comparison text when data is loaded", () => {
    mockUseProgressReport.mockReturnValue({
      data: MOCK_REPORT,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof progressFeature.useProgressReport>);

    renderProgressRoute();

    expect(screen.getByText("Task Completion")).toBeInTheDocument();
    expect(screen.getByText("Completed 15 tasks and 500 focus minutes.")).toBeInTheDocument();
    expect(screen.getByText("Metric Dict v1.0.0")).toBeInTheDocument();
  });

  it("navigates to reports screen when clicking Export Report button", async () => {
    mockUseProgressReport.mockReturnValue({
      data: MOCK_REPORT,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof progressFeature.useProgressReport>);

    renderProgressRoute();

    const user = userEvent.setup();
    const exportBtn = screen.getByRole("button", { name: "Export Report" });
    await user.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText("Reports Screen")).toBeInTheDocument();
    });
  });

  it("updates URL parameters when selecting period preset or project filter", async () => {
    mockUseProgressReport.mockReturnValue({
      data: MOCK_REPORT,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof progressFeature.useProgressReport>);

    renderProgressRoute();

    const user = userEvent.setup();
    const todayBtn = screen.getByRole("button", { name: "Today" });
    await user.click(todayBtn);

    expect(mockUseProgressReport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        periodPreset: "TODAY",
      }),
      true,
    );

    const projectSelect = screen.getByLabelText("Filter by Project");
    await user.selectOptions(projectSelect, "p-1");

    expect(mockUseProgressReport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projectId: "p-1",
      }),
      true,
    );
  });

  it("renders range exceeded warning alert when custom dates exceed 366 days", () => {
    mockUseProgressReport.mockReturnValue({
      data: MOCK_REPORT,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof progressFeature.useProgressReport>);

    renderProgressRoute([
      "/life-os/app/progress?preset=CUSTOM&startDate=2024-01-01&endDate=2026-01-01",
    ]);

    expect(screen.getByText("Date Range Exceeds 1 Year")).toBeInTheDocument();
  });

  it("renders empty state when report has zero activity", () => {
    mockUseProgressReport.mockReturnValue({
      data: EMPTY_REPORT,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof progressFeature.useProgressReport>);

    renderProgressRoute();

    expect(screen.getByText("No progress data for selected period")).toBeInTheDocument();
  });
});
