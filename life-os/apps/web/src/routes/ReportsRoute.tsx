import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ReportsScreen,
  useReportDefinitions,
  useReportData,
  getReportPresetDates,
  saveRecentReportSettings,
  loadRecentReportSettings,
  type NamedReportType,
  type ReportPeriodPreset,
  type ReportFilterParams,
} from "@features/reports";
import { useProjects } from "@features/projects";
import { useAuthSession } from "@state/authSession";

const VALID_REPORT_TYPES: readonly NamedReportType[] = [
  "TASK_COMPLETION",
  "TIME_ALLOCATION",
  "PROJECT_PROGRESS",
  "GOAL_EXECUTION",
  "REVIEW_RITUALS",
  "COMPREHENSIVE_PROGRESS",
];

const VALID_PRESETS: readonly ReportPeriodPreset[] = [
  "TODAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "THIS_QUARTER",
  "THIS_YEAR",
  "CUSTOM",
];

export function ReportsRoute() {
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hasSavedSettings, setHasSavedSettings] = useState<boolean>(() => {
    return loadRecentReportSettings() !== null;
  });

  const reportTypeParam = searchParams.get("reportType") as NamedReportType;
  const reportType: NamedReportType = VALID_REPORT_TYPES.includes(reportTypeParam)
    ? reportTypeParam
    : "TASK_COMPLETION";

  const presetParam = searchParams.get("preset") as ReportPeriodPreset;
  const periodPreset: ReportPeriodPreset = VALID_PRESETS.includes(presetParam)
    ? presetParam
    : "THIS_MONTH";

  const defaultDates = useMemo(() => getReportPresetDates(periodPreset), [periodPreset]);
  const startDate = searchParams.get("startDate") ?? defaultDates.startDate;
  const endDate = searchParams.get("endDate") ?? defaultDates.endDate;
  const projectId = searchParams.get("projectId") ?? undefined;
  const labelId = searchParams.get("labelId") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const timeZone = user?.timeZone ?? "UTC";

  const filterParams: ReportFilterParams = useMemo(
    () => ({
      reportType,
      periodPreset,
      startDate,
      endDate,
      timeZone,
      projectId,
      labelId,
      category,
    }),
    [reportType, periodPreset, startDate, endDate, timeZone, projectId, labelId, category],
  );

  const definitionsQuery = useReportDefinitions(user !== null);
  const reportDataQuery = useReportData(filterParams, user !== null);
  const projectsQuery = useProjects({ size: 100, archived: false }, user !== null);

  const updateFilter = useCallback(
    (next: ReportFilterParams) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("reportType", next.reportType);
          params.set("preset", next.periodPreset);
          params.set("startDate", next.startDate);
          params.set("endDate", next.endDate);

          if (next.projectId) {
            params.set("projectId", next.projectId);
          } else {
            params.delete("projectId");
          }

          if (next.labelId) {
            params.set("labelId", next.labelId);
          } else {
            params.delete("labelId");
          }

          if (next.category) {
            params.set("category", next.category);
          } else {
            params.delete("category");
          }

          return Object.fromEntries(params.entries());
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleSaveRecentSettings = useCallback(() => {
    saveRecentReportSettings({
      reportType: filterParams.reportType,
      periodPreset: filterParams.periodPreset,
      startDate: filterParams.startDate,
      endDate: filterParams.endDate,
      projectId: filterParams.projectId,
      labelId: filterParams.labelId,
      category: filterParams.category,
    });
    setHasSavedSettings(true);
  }, [filterParams]);

  const handleRestoreRecentSettings = useCallback(() => {
    const saved = loadRecentReportSettings();
    if (saved) {
      updateFilter({
        reportType: saved.reportType,
        periodPreset: saved.periodPreset,
        startDate: saved.startDate,
        endDate: saved.endDate,
        timeZone,
        projectId: saved.projectId,
        labelId: saved.labelId,
        category: saved.category,
      });
    }
  }, [updateFilter, timeZone]);

  const projectsList = useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      })),
    [projectsQuery.data?.items],
  );

  const isLoading = definitionsQuery.isPending || reportDataQuery.isPending;
  const isError = reportDataQuery.isError;
  const errorMessage = reportDataQuery.error?.message ?? "Failed to load report data.";

  return (
    <ReportsScreen
      report={reportDataQuery.data ?? null}
      definitions={definitionsQuery.data ?? []}
      filter={filterParams}
      onFilterChange={updateFilter}
      loading={isLoading}
      error={isError ? errorMessage : null}
      onRetry={() => reportDataQuery.refetch()}
      projects={projectsList}
      onSaveRecentSettings={handleSaveRecentSettings}
      onRestoreRecentSettings={handleRestoreRecentSettings}
      hasSavedSettings={hasSavedSettings}
    />
  );
}
