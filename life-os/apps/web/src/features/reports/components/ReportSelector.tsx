import { FileText, Calendar, Target, CheckCircle2, Clock, Layers } from "lucide-react";
import { Select, Badge } from "@components/ui";
import type { NamedReportType, ReportDefinition } from "../model/reports";
import "./report-selector.css";

export interface ReportSelectorProps {
  readonly selectedReportType: NamedReportType;
  readonly onSelectReportType: (type: NamedReportType) => void;
  readonly definitions?: readonly ReportDefinition[] | undefined;
  readonly loading?: boolean | undefined;
}

const REPORT_TYPE_ICONS: Record<NamedReportType, React.ElementType> = {
  TASK_COMPLETION: CheckCircle2,
  TIME_ALLOCATION: Clock,
  PROJECT_PROGRESS: Layers,
  GOAL_EXECUTION: Target,
  REVIEW_RITUALS: Calendar,
  COMPREHENSIVE_PROGRESS: FileText,
};

const DEFAULT_DEFINITIONS: readonly ReportDefinition[] = [
  {
    reportType: "TASK_COMPLETION",
    name: "Task Completion & Throughput Report",
    description: "Task completion counts, velocity trends, priority breakdown, and overdue rates.",
    category: "TASKS",
    supportedFilters: ["startDate", "endDate", "projectId", "labelId"],
    defaultTimeframeDays: 30,
    asyncThresholdDays: 90,
  },
  {
    reportType: "TIME_ALLOCATION",
    name: "Focus Time & Category Allocation Report",
    description: "Planned vs actual focus time, category breakdown, and daily average focus hours.",
    category: "TIME",
    supportedFilters: ["startDate", "endDate", "category"],
    defaultTimeframeDays: 30,
    asyncThresholdDays: 90,
  },
  {
    reportType: "PROJECT_PROGRESS",
    name: "Project Health & Milestone Status Report",
    description:
      "Active vs completed projects, status distribution, average progress, and milestone completion.",
    category: "PROJECTS",
    supportedFilters: ["startDate", "endDate", "projectId"],
    defaultTimeframeDays: 30,
    asyncThresholdDays: 90,
  },
  {
    reportType: "GOAL_EXECUTION",
    name: "Goal Execution & Check-in Recency Report",
    description: "Goal progress trends, check-in recency, and linked work completion ratios.",
    category: "GOALS",
    supportedFilters: ["startDate", "endDate"],
    defaultTimeframeDays: 30,
    asyncThresholdDays: 90,
  },
  {
    reportType: "REVIEW_RITUALS",
    name: "Review Ritual & Streak Report",
    description: "Daily/weekly review ritual completion rates and active review streak tracking.",
    category: "REVIEWS",
    supportedFilters: ["startDate", "endDate"],
    defaultTimeframeDays: 30,
    asyncThresholdDays: 90,
  },
  {
    reportType: "COMPREHENSIVE_PROGRESS",
    name: "Comprehensive Executive Progress Report",
    description:
      "Executive summary combining task, focus time, project, goal, habit, and review analytics.",
    category: "COMPREHENSIVE",
    supportedFilters: ["startDate", "endDate", "projectId", "labelId", "category"],
    defaultTimeframeDays: 30,
    asyncThresholdDays: 90,
  },
];

export function ReportSelector({
  selectedReportType,
  onSelectReportType,
  definitions = DEFAULT_DEFINITIONS,
  loading = false,
}: ReportSelectorProps) {
  const activeDefs: readonly ReportDefinition[] =
    definitions && definitions.length > 0 ? definitions : DEFAULT_DEFINITIONS;

  const selectOptions = activeDefs.map((def) => ({
    value: def.reportType,
    label: def.name,
  }));

  const selectedDef =
    activeDefs.find((d) => d.reportType === selectedReportType) ??
    activeDefs[0] ??
    DEFAULT_DEFINITIONS[0];
  const Icon = REPORT_TYPE_ICONS[selectedReportType] ?? FileText;

  return (
    <div className="report-selector" data-testid="report-selector">
      <div className="report-selector__header">
        <Select
          id="report-type-select"
          label="Report Type"
          value={selectedReportType}
          options={selectOptions}
          onChange={(e) => onSelectReportType(e.target.value as NamedReportType)}
          disabled={loading}
          aria-label="Select Report Type"
        />
      </div>

      <div className="report-selector__active-card">
        <div className="report-selector__icon-wrapper">
          <Icon className="report-selector__icon" aria-hidden="true" />
        </div>
        <div className="report-selector__info">
          <div className="report-selector__title-row">
            <h2 className="report-selector__title">{selectedDef!.name}</h2>
            <Badge tone="neutral">{selectedDef!.category}</Badge>
          </div>
          <p className="report-selector__description">{selectedDef!.description}</p>
          <div className="report-selector__meta">
            <span>Default timeframe: {selectedDef!.defaultTimeframeDays} days</span>
            <span>•</span>
            <span>Async threshold: &gt;{selectedDef!.asyncThresholdDays} days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
