import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportExportButton } from "../components/ReportExportButton";
import type { ReportFilterParams } from "../model/reports";
import * as csvExportApi from "../api/csvExportApi";

vi.mock("../api/csvExportApi", () => ({
  requestCsvExport: vi.fn(),
  buildCsvDownloadUrl: vi.fn(() => "/life-os/api/v1/reports/export/csv/download?token=mock"),
}));

const DEFAULT_FILTER: ReportFilterParams = {
  reportType: "TASK_COMPLETION",
  periodPreset: "THIS_MONTH",
  startDate: "2026-08-01",
  endDate: "2026-08-27",
  timeZone: "UTC",
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ReportExportButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Export CSV button", () => {
    renderWithClient(<ReportExportButton filter={DEFAULT_FILTER} reportAvailable={true} />);
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
  });

  it("disables button when reportAvailable is false", () => {
    renderWithClient(<ReportExportButton filter={DEFAULT_FILTER} reportAvailable={false} />);
    expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled();
  });

  it("disables button when reportLoading is true", () => {
    renderWithClient(
      <ReportExportButton filter={DEFAULT_FILTER} reportAvailable={true} reportLoading={true} />,
    );
    expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled();
  });

  it("does not call export when button is disabled", () => {
    renderWithClient(<ReportExportButton filter={DEFAULT_FILTER} reportAvailable={false} />);
    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    expect(csvExportApi.requestCsvExport).not.toHaveBeenCalled();
  });

  it("calls requestCsvExport when button is clicked and report is available", async () => {
    vi.mocked(csvExportApi.requestCsvExport).mockResolvedValueOnce({
      exportId: "exp-1",
      fileName: "lifeos-task-completion.csv",
      downloadToken: "tok123",
      tokenTtlMinutes: 15,
      reportType: "TASK_COMPLETION",
      startDate: "2026-08-01",
      endDate: "2026-08-27",
      timeZone: "UTC",
    });

    // Stub anchor click
    const originalCreateElement = document.createElement.bind(document);
    const anchorClickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const el = originalCreateElement("a");
        el.click = anchorClickSpy;
        return el;
      }
      return originalCreateElement(tag);
    });

    renderWithClient(<ReportExportButton filter={DEFAULT_FILTER} reportAvailable={true} />);

    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));

    await vi.waitFor(() => {
      expect(csvExportApi.requestCsvExport).toHaveBeenCalledWith(
        expect.objectContaining({ reportType: "TASK_COMPLETION", timeZone: "UTC" }),
      );
    });

    vi.restoreAllMocks();
  });

  it("shows error message when export fails", async () => {
    vi.mocked(csvExportApi.requestCsvExport).mockRejectedValueOnce(
      new Error("CSV export failed. Please try a shorter date range."),
    );

    renderWithClient(<ReportExportButton filter={DEFAULT_FILTER} reportAvailable={true} />);

    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));

    // Wait for error to appear
    await vi.waitFor(() => {
      expect(screen.queryByTestId("report-export-error")).toBeInTheDocument();
    });
  });

  it("does not have aria-busy attribute when idle", () => {
    renderWithClient(<ReportExportButton filter={DEFAULT_FILTER} reportAvailable={true} />);
    const btn = screen.getByRole("button", { name: /export csv/i });
    expect(btn).not.toHaveAttribute("aria-busy");
  });
});
