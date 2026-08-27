import { useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ProgressScreen,
  useProgressReport,
  getPeriodPresetDates,
  type PeriodPreset,
  type ProgressFilterParams,
} from "@features/progress";
import { useProjects } from "@features/projects";
import { useAuthSession } from "@state/authSession";

const VALID_PRESETS: readonly PeriodPreset[] = [
  "TODAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "THIS_QUARTER",
  "THIS_YEAR",
  "CUSTOM",
];

export function ProgressRoute() {
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const presetParam = searchParams.get("preset") as PeriodPreset;
  const periodPreset: PeriodPreset = VALID_PRESETS.includes(presetParam)
    ? presetParam
    : "THIS_MONTH";

  const defaultDates = useMemo(() => getPeriodPresetDates(periodPreset), [periodPreset]);
  const startDate = searchParams.get("startDate") ?? defaultDates.startDate;
  const endDate = searchParams.get("endDate") ?? defaultDates.endDate;
  const projectId = searchParams.get("projectId") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const timeZone = user?.timeZone ?? "UTC";

  const filterParams: ProgressFilterParams = useMemo(
    () => ({
      periodPreset,
      startDate,
      endDate,
      timeZone,
      projectId,
      category,
    }),
    [periodPreset, startDate, endDate, timeZone, projectId, category],
  );

  const progressQuery = useProgressReport(filterParams, user !== null);
  const projectsQuery = useProjects({ size: 100, archived: false }, user !== null);

  const updateFilter = useCallback(
    (next: ProgressFilterParams) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("preset", next.periodPreset);
          params.set("startDate", next.startDate);
          params.set("endDate", next.endDate);

          if (next.projectId) {
            params.set("projectId", next.projectId);
          } else {
            params.delete("projectId");
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

  const projectsList = useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      })),
    [projectsQuery.data?.items],
  );

  const handleExportClick = useCallback(() => {
    navigate("/life-os/app/reports");
  }, [navigate]);

  return (
    <ProgressScreen
      report={progressQuery.data ?? null}
      filter={filterParams}
      onFilterChange={updateFilter}
      loading={progressQuery.isPending}
      error={
        progressQuery.isError
          ? (progressQuery.error?.message ?? "Failed to load progress report.")
          : null
      }
      onRetry={() => progressQuery.refetch()}
      projects={projectsList}
      onExportClick={handleExportClick}
    />
  );
}
