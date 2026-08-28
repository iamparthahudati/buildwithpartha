import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportsRoute } from "./ReportsRoute";
import * as reportsFeature from "@features/reports";
import * as projectsFeature from "@features/projects";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";

vi.mock("@features/reports", async () => {
  const actual = await vi.importActual<typeof reportsFeature>("@features/reports");
  return {
    ...actual,
    useReportDefinitions: vi.fn(),
    useReportData: vi.fn(),
  };
});

vi.mock("@features/projects", async () => {
  const actual = await vi.importActual<typeof projectsFeature>("@features/projects");
  return {
    ...actual,
    useProjects: vi.fn(),
  };
});

const mockUseReportDefinitions = vi.mocked(reportsFeature.useReportDefinitions);
const mockUseReportData = vi.mocked(reportsFeature.useReportData);
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

const MOCK_DEFINITIONS: reportsFeature.ReportDefinition[] = [
  {
    reportType: "TASK_COMPLETION",
    name: "Task Completion Report",
    description: "Task throughput and velocity.",
    category: "TASKS",
    supportedFilters: ["startDate", "endDate", "projectId"],
    defaultTimeframeDays: 30,
    asyncThresholdDays: 90,
  },
];

const MOCK_REPORT_DATA: reportsFeature.ReportDataResponse = {
  reportType: "TASK_COMPLETION",
  reportName: "Task Completion Report",
  description: "Task completion metrics and throughput.",
  metricDictionaryVersion: "1.0.0",
  generatedAt: "2026-08-27T00:00:00Z",
  timeZone: "Asia/Kolkata",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  isAsynchronous: false,
  asyncThresholdDays: 90,
  status: "COMPLETED",
  summaryText: "Completed 42 tasks.",
  metrics: [
    {
      key: "completed_count",
      name: "Total Tasks Completed",
      value: "42",
      numericValue: 42,
      unit: "tasks",
      comparisonValue: "+10%",
      status: "SUCCESS",
    },
  ],
  tables: [],
  chartSeries: [],
};

function renderReportsRoute(initialEntries = ["/life-os/app/reports"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/life-os/app/reports" element={<ReportsRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe("ReportsRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjects.mockReturnValue({
      data: { items: [{ id: "p-1", name: "Alpha Project" }], page: null, summary: null },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjects>);

    mockUseReportDefinitions.mockReturnValue({
      data: MOCK_DEFINITIONS,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof reportsFeature.useReportDefinitions>);
  });

  it("calls useReportData with default filter params", () => {
    mockUseReportData.mockReturnValue({
      data: MOCK_REPORT_DATA,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof reportsFeature.useReportData>);

    renderReportsRoute();

    expect(screen.getByRole("heading", { name: "Reports & Analytics" })).toBeInTheDocument();
    expect(mockUseReportData).toHaveBeenCalledWith(
      expect.objectContaining({
        reportType: "TASK_COMPLETION",
        periodPreset: "THIS_MONTH",
        timeZone: "Asia/Kolkata",
      }),
      true,
    );
  });

  it("parses URL parameters correctly", () => {
    mockUseReportData.mockReturnValue({
      data: MOCK_REPORT_DATA,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof reportsFeature.useReportData>);

    renderReportsRoute([
      "/life-os/app/reports?reportType=TASK_COMPLETION&preset=THIS_WEEK&startDate=2026-08-01&endDate=2026-08-07&projectId=p-1",
    ]);

    expect(mockUseReportData).toHaveBeenCalledWith(
      expect.objectContaining({
        reportType: "TASK_COMPLETION",
        periodPreset: "THIS_WEEK",
        startDate: "2026-08-01",
        endDate: "2026-08-07",
        projectId: "p-1",
        timeZone: "Asia/Kolkata",
      }),
      true,
    );
  });

  it("renders loading skeleton when report data is pending", () => {
    mockUseReportData.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof reportsFeature.useReportData>);

    renderReportsRoute();

    expect(screen.getByTestId("reports-skeleton")).toBeInTheDocument();
  });

  it("renders error state and handles retry", async () => {
    const mockRefetch = vi.fn();
    mockUseReportData.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Network error loading report"),
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof reportsFeature.useReportData>);

    renderReportsRoute();

    expect(screen.getByText("Network error loading report")).toBeInTheDocument();

    const user = userEvent.setup();
    const retryBtn = screen.getByRole("button", { name: /retry loading/i });
    await user.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalledOnce();
  });
});
