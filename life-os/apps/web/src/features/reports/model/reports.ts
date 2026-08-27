export type NamedReportType =
  | "TASK_COMPLETION"
  | "TIME_ALLOCATION"
  | "PROJECT_PROGRESS"
  | "GOAL_EXECUTION"
  | "REVIEW_RITUALS"
  | "COMPREHENSIVE_PROGRESS";

export type ReportCategory = "TASKS" | "TIME" | "PROJECTS" | "GOALS" | "REVIEWS" | "COMPREHENSIVE";

export type ReportChartType = "LINE" | "BAR" | "PIE" | "DONUT";

export type ReportPeriodPreset =
  "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_QUARTER" | "THIS_YEAR" | "CUSTOM";

export interface ReportDefinition {
  reportType: NamedReportType;
  name: string;
  description: string;
  category: ReportCategory;
  supportedFilters: string[];
  defaultTimeframeDays: number;
  asyncThresholdDays: number;
}

export interface ReportMetricItem {
  key: string;
  name: string;
  value: string;
  numericValue: number | null;
  unit: string | null;
  comparisonValue: string | null;
  status: string | null;
}

export interface ReportTable {
  tableId: string;
  title: string;
  description: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  totalRows: number;
}

export interface ReportDataPoint {
  label: string;
  value: number | null;
  category: string | null;
  date: string | null;
}

export interface ReportChartSeries {
  chartId: string;
  title: string;
  chartType: ReportChartType;
  xAxisLabel: string | null;
  yAxisLabel: string | null;
  dataPoints: ReportDataPoint[];
}

export interface ReportDataResponse {
  reportType: NamedReportType;
  reportName: string;
  description: string;
  metricDictionaryVersion: string;
  generatedAt: string;
  timeZone: string;
  startDate: string;
  endDate: string;
  projectId?: string | null;
  labelId?: string | null;
  category?: string | null;
  isAsynchronous: boolean;
  asyncThresholdDays: number;
  jobId?: string | null;
  status: string;
  summaryText: string;
  metrics: ReportMetricItem[];
  tables: ReportTable[];
  chartSeries: ReportChartSeries[];
}

export interface ReportFilterParams {
  reportType: NamedReportType;
  periodPreset: ReportPeriodPreset;
  startDate: string;
  endDate: string;
  timeZone: string;
  projectId?: string | undefined;
  labelId?: string | undefined;
  category?: string | undefined;
}

export interface SavedReportSettings {
  reportType: NamedReportType;
  periodPreset: ReportPeriodPreset;
  startDate: string;
  endDate: string;
  projectId?: string | undefined;
  labelId?: string | undefined;
  category?: string | undefined;
}

const RECENT_SETTINGS_STORAGE_KEY = "lifeos_recent_report_settings";

/**
 * Persists recent report selection and filter settings to browser localStorage.
 */
export function saveRecentReportSettings(settings: SavedReportSettings): void {
  try {
    localStorage.setItem(RECENT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or access errors in restricted browser contexts
  }
}

/**
 * Loads saved recent report settings from localStorage if available.
 */
export function loadRecentReportSettings(): SavedReportSettings | null {
  try {
    const raw = localStorage.getItem(RECENT_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedReportSettings;
    if (parsed && typeof parsed.reportType === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clears saved recent report settings from localStorage.
 */
export function clearRecentReportSettings(): void {
  try {
    localStorage.removeItem(RECENT_SETTINGS_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Computes ISO YYYY-MM-DD date range for a given report preset based on local reference date.
 */
export function getReportPresetDates(
  preset: ReportPeriodPreset,
  referenceDate: Date = new Date(),
): { startDate: string; endDate: string } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  const formatDate = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  if (preset === "TODAY") {
    const todayStr = formatDate(referenceDate);
    return { startDate: todayStr, endDate: todayStr };
  }

  if (preset === "THIS_WEEK") {
    const dayOfWeek = referenceDate.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(year, month, day + diffToMonday);
    const sunday = new Date(year, month, day + diffToMonday + 6);
    return { startDate: formatDate(monday), endDate: formatDate(sunday) };
  }

  if (preset === "THIS_MONTH") {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
  }

  if (preset === "THIS_QUARTER") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    const firstDay = new Date(year, quarterStartMonth, 1);
    const lastDay = new Date(year, quarterStartMonth + 3, 0);
    return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
  }

  if (preset === "THIS_YEAR") {
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
}
