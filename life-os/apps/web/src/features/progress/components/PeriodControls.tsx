import type { ChangeEvent } from "react";
import { Button, Badge, DateInput, Surface, Text } from "@components/ui";
import { PeriodPreset, ProgressFilterParams, getPeriodPresetDates } from "../model/progress";
import "./period-controls.css";

export interface PeriodControlsProps {
  readonly value: ProgressFilterParams;
  readonly onChange: (next: ProgressFilterParams) => void;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
}

const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "TODAY", label: "Today" },
  { id: "THIS_WEEK", label: "This Week" },
  { id: "THIS_MONTH", label: "This Month" },
  { id: "THIS_QUARTER", label: "This Quarter" },
  { id: "THIS_YEAR", label: "This Year" },
  { id: "CUSTOM", label: "Custom" },
];

export function PeriodControls({
  value,
  onChange,
  loading = false,
  disabled = false,
  className,
}: PeriodControlsProps) {
  const handlePresetSelect = (preset: PeriodPreset) => {
    if (disabled || loading) return;
    if (preset === "CUSTOM") {
      onChange({ ...value, periodPreset: "CUSTOM" });
    } else {
      const dates = getPeriodPresetDates(preset);
      onChange({
        ...value,
        periodPreset: preset,
        startDate: dates.startDate,
        endDate: dates.endDate,
      });
    }
  };

  const handleStartDateChange = (startDate: string) => {
    if (disabled || loading) return;
    onChange({
      ...value,
      periodPreset: "CUSTOM",
      startDate,
    });
  };

  const handleEndDateChange = (endDate: string) => {
    if (disabled || loading) return;
    onChange({
      ...value,
      periodPreset: "CUSTOM",
      endDate,
    });
  };

  return (
    <Surface
      as="section"
      title="Period and Filters"
      padding="md"
      className={["period-controls", className].filter(Boolean).join(" ")}
    >
      <div className="period-controls__header">
        <div className="period-controls__presets" role="toolbar" aria-label="Select period preset">
          {PERIOD_PRESETS.map((preset) => {
            const isSelected = value.periodPreset === preset.id;
            return (
              <Button
                key={preset.id}
                variant={isSelected ? "primary" : "secondary"}
                size="sm"
                aria-pressed={isSelected}
                disabled={disabled || loading}
                onClick={() => handlePresetSelect(preset.id)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>

        <div className="period-controls__meta">
          <Badge tone="neutral">TZ: {value.timeZone || "UTC"}</Badge>
        </div>
      </div>

      <div className="period-controls__date-inputs">
        <div className="period-controls__field">
          <Text size="xs" weight="medium" tone="secondary">
            Start Date
          </Text>
          <DateInput
            label="Start Date"
            value={value.startDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleStartDateChange(e.target.value)}
            disabled={disabled || loading}
          />
        </div>

        <div className="period-controls__field">
          <Text size="xs" weight="medium" tone="secondary">
            End Date
          </Text>
          <DateInput
            label="End Date"
            value={value.endDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleEndDateChange(e.target.value)}
            disabled={disabled || loading}
          />
        </div>
      </div>
    </Surface>
  );
}
