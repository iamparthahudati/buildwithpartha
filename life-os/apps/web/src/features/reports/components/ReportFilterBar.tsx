import { DateInput, Select, Button } from "@components/ui";
import {
  type ReportPeriodPreset,
  type ReportFilterParams,
  getReportPresetDates,
} from "../model/reports";
import "./report-filter-bar.css";

export interface ReportFilterBarProps {
  readonly value: ReportFilterParams;
  readonly onChange: (next: ReportFilterParams) => void;
  readonly projects?: readonly { readonly id: string; readonly name: string }[] | undefined;
  readonly categories?: readonly string[] | undefined;
  readonly supportedFilters?: readonly string[] | undefined;
  readonly loading?: boolean | undefined;
}

const PERIOD_PRESETS: readonly { readonly id: ReportPeriodPreset; readonly label: string }[] = [
  { id: "TODAY", label: "Today" },
  { id: "THIS_WEEK", label: "This Week" },
  { id: "THIS_MONTH", label: "This Month" },
  { id: "THIS_QUARTER", label: "This Quarter" },
  { id: "THIS_YEAR", label: "This Year" },
  { id: "CUSTOM", label: "Custom Range" },
];

export function ReportFilterBar({
  value,
  onChange,
  projects = [],
  categories = ["Engineering", "Product", "Design", "Ops", "Personal", "Learning"],
  supportedFilters,
  loading = false,
}: ReportFilterBarProps) {
  const isFilterSupported = (filterKey: string) => {
    if (!supportedFilters || supportedFilters.length === 0) return true;
    return supportedFilters.includes(filterKey);
  };

  const handlePresetSelect = (preset: ReportPeriodPreset) => {
    if (preset === "CUSTOM") {
      onChange({ ...value, periodPreset: "CUSTOM" });
      return;
    }
    const dates = getReportPresetDates(preset);
    onChange({
      ...value,
      periodPreset: preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });
  };

  const projectOptions = [
    { value: "", label: "All Projects" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="report-filter-bar" data-testid="report-filter-bar">
      <div
        className="report-filter-bar__presets-group"
        role="group"
        aria-label="Time period presets"
      >
        {PERIOD_PRESETS.map((preset) => {
          const isSelected = value.periodPreset === preset.id;
          return (
            <Button
              key={preset.id}
              type="button"
              variant={isSelected ? "primary" : "secondary"}
              size="sm"
              onClick={() => handlePresetSelect(preset.id)}
              disabled={loading}
              aria-pressed={isSelected}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>

      <div className="report-filter-bar__inputs-row">
        {isFilterSupported("startDate") && (
          <DateInput
            label="Start Date"
            value={value.startDate}
            onChange={(e) =>
              onChange({
                ...value,
                periodPreset: "CUSTOM",
                startDate: e.target.value,
              })
            }
            disabled={loading}
          />
        )}

        {isFilterSupported("endDate") && (
          <DateInput
            label="End Date"
            value={value.endDate}
            onChange={(e) =>
              onChange({
                ...value,
                periodPreset: "CUSTOM",
                endDate: e.target.value,
              })
            }
            disabled={loading}
          />
        )}

        {isFilterSupported("projectId") && projects.length > 0 && (
          <Select
            label="Project"
            value={value.projectId ?? ""}
            options={projectOptions}
            onChange={(e) =>
              onChange({
                ...value,
                projectId: e.target.value || undefined,
              })
            }
            disabled={loading}
          />
        )}

        {isFilterSupported("category") && (
          <Select
            label="Category"
            value={value.category ?? ""}
            options={categoryOptions}
            onChange={(e) =>
              onChange({
                ...value,
                category: e.target.value || undefined,
              })
            }
            disabled={loading}
          />
        )}
      </div>
    </div>
  );
}
