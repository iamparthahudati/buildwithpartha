import { useId } from "react";
import { Calendar, RefreshCw, WifiOff } from "lucide-react";

import {
  DateInput,
  Icon,
  NumberInput,
  RadioGroup,
  Select,
  fieldIds,
  type RadioOption,
  type SelectOption,
} from "@components/ui";

import {
  ALL_DAYS_OF_WEEK,
  DAY_OF_WEEK_LABELS,
  calculateNextOccurrences,
  formatRecurrenceRuleSummary,
  validateRecurrenceRule,
  type RecurrenceDayOfWeek,
  type RecurrenceEndMode,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from "./recurrenceContract";

import "./recurrence-editor.css";

export interface RecurrenceEditorProps {
  readonly id?: string;
  readonly legend?: string;
  readonly value: RecurrenceRule;
  readonly onChange: (value: RecurrenceRule) => void;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly isOffline?: boolean;
  readonly error?: string;
  readonly maxPreviewOccurrences?: number;
  readonly className?: string;
}

const FREQUENCY_OPTIONS: readonly SelectOption[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKDAY", label: "Every Weekday (Mon–Fri)" },
  { value: "INTERVAL", label: "Interval (Every N days)" },
  { value: "AFTER_COMPLETION", label: "After Completion" },
];

const END_MODE_OPTIONS: readonly RadioOption[] = [
  { value: "NEVER", label: "Never end" },
  { value: "UNTIL_DATE", label: "On date" },
  { value: "COUNT", label: "After number of occurrences" },
];

export function RecurrenceEditor({
  id,
  legend = "Recurrence Pattern",
  value,
  onChange,
  disabled = false,
  readOnly = false,
  isOffline = false,
  error,
  maxPreviewOccurrences = 5,
  className,
}: RecurrenceEditorProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;

  const validation = validateRecurrenceRule(value);
  const effectiveError =
    error ?? (validation.valid ? undefined : Object.values(validation.errors)[0]);

  const ids = fieldIds(baseId, {
    hasDescription: false,
    hasError: Boolean(effectiveError),
  });

  const summaryText = formatRecurrenceRuleSummary(value);
  const nextOccurrences = calculateNextOccurrences(value, maxPreviewOccurrences);

  const handleFrequencyChange = (newFreq: string) => {
    const freq = newFreq as RecurrenceFrequency;
    let daysOfWeek = value.daysOfWeek;
    let dayOfMonth = value.dayOfMonth;

    if (freq === "WEEKLY" && (!daysOfWeek || daysOfWeek.length === 0)) {
      daysOfWeek = ["MONDAY"];
    }
    if (freq === "MONTHLY" && (dayOfMonth === undefined || dayOfMonth === null)) {
      dayOfMonth = 1;
    }

    const updated: RecurrenceRule = {
      ...value,
      frequency: freq,
      ...(daysOfWeek !== undefined ? { daysOfWeek } : {}),
      ...(dayOfMonth !== undefined ? { dayOfMonth } : {}),
    };

    onChange(updated);
  };

  const handleIntervalChange = (val: number | null) => {
    onChange({
      ...value,
      intervalValue: val && val >= 1 ? val : 1,
    });
  };

  const handleDayOfWeekToggle = (day: RecurrenceDayOfWeek) => {
    if (readOnly || disabled) return;
    const currentDays = value.daysOfWeek ?? [];
    const isSelected = currentDays.includes(day);

    let nextDays: RecurrenceDayOfWeek[];
    if (isSelected) {
      nextDays = currentDays.filter((d) => d !== day);
      if (nextDays.length === 0) {
        nextDays = [day];
      }
    } else {
      nextDays = [...currentDays, day];
    }

    onChange({
      ...value,
      daysOfWeek: nextDays,
    });
  };

  const handleEndModeChange = (newMode: string) => {
    const endMode = newMode as RecurrenceEndMode;
    let endDate = value.endDate;
    let endCount = value.endCount;

    if (endMode === "UNTIL_DATE" && !endDate) {
      endDate = value.startDate;
    }
    if (endMode === "COUNT" && (!endCount || endCount < 1)) {
      endCount = 10;
    }

    const updated: RecurrenceRule = {
      ...value,
      endMode,
      ...(endDate !== undefined ? { endDate } : {}),
      ...(endCount !== undefined ? { endCount } : {}),
    };

    onChange(updated);
  };

  return (
    <fieldset
      id={baseId}
      className={["lifeos-recurrence-editor", className].filter(Boolean).join(" ")}
      aria-describedby={ids.errorId}
      aria-invalid={effectiveError ? true : undefined}
      disabled={disabled}
    >
      <legend className="lifeos-recurrence-editor__legend">{legend}</legend>

      {isOffline && (
        <div className="lifeos-recurrence-editor__offline-notice" role="status">
          <Icon icon={WifiOff} size="sm" decorative />
          <span>Working offline. Recurrence changes will sync when connected.</span>
        </div>
      )}

      <div className="lifeos-recurrence-editor__grid">
        <Select
          id={`${baseId}-frequency`}
          label="Frequency"
          value={value.frequency}
          options={FREQUENCY_OPTIONS}
          onChange={(e) => handleFrequencyChange(e.target.value)}
          disabled={disabled || readOnly}
        />

        <NumberInput
          id={`${baseId}-interval`}
          label={
            value.frequency === "WEEKLY"
              ? "Every (weeks)"
              : value.frequency === "MONTHLY"
                ? "Every (months)"
                : value.frequency === "AFTER_COMPLETION"
                  ? "Days after completion"
                  : "Interval (days)"
          }
          value={value.intervalValue}
          onChange={(e) => {
            const raw = e.target.value;
            handleIntervalChange(raw === "" ? null : Number(raw));
          }}
          min={1}
          max={365}
          disabled={disabled}
          readOnly={readOnly}
          {...(validation.errors.intervalValue ? { error: validation.errors.intervalValue } : {})}
        />

        {value.frequency === "WEEKLY" && (
          <div className="lifeos-recurrence-editor__days-group">
            <span id={`${baseId}-days-label`} className="lifeos-recurrence-editor__days-label">
              Days of Week
            </span>
            <div
              className="lifeos-recurrence-editor__days-buttons"
              role="group"
              aria-labelledby={`${baseId}-days-label`}
            >
              {ALL_DAYS_OF_WEEK.map((day) => {
                const isSelected = (value.daysOfWeek ?? []).includes(day);
                const info = DAY_OF_WEEK_LABELS[day];
                return (
                  <button
                    key={day}
                    type="button"
                    className={[
                      "lifeos-recurrence-editor__day-button",
                      isSelected ? "lifeos-recurrence-editor__day-button--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={isSelected}
                    onClick={() => handleDayOfWeekToggle(day)}
                    disabled={disabled || readOnly}
                  >
                    {info.short}
                  </button>
                );
              })}
            </div>
            {validation.errors.daysOfWeek && (
              <span className="lifeos-field__error">{validation.errors.daysOfWeek}</span>
            )}
          </div>
        )}

        {value.frequency === "MONTHLY" && (
          <NumberInput
            id={`${baseId}-day-of-month`}
            label="Day of Month"
            value={value.dayOfMonth ?? 1}
            onChange={(e) => {
              const raw = Number(e.target.value);
              onChange({
                ...value,
                dayOfMonth: raw >= 1 && raw <= 31 ? raw : 1,
              });
            }}
            min={1}
            max={31}
            disabled={disabled}
            readOnly={readOnly}
            {...(validation.errors.dayOfMonth ? { error: validation.errors.dayOfMonth } : {})}
          />
        )}
      </div>

      <RadioGroup
        name={`${baseId}-end-mode`}
        legend="End Rule"
        options={END_MODE_OPTIONS}
        value={value.endMode}
        onValueChange={(val) => handleEndModeChange(val)}
        disabled={disabled || readOnly}
      />

      {value.endMode === "UNTIL_DATE" && (
        <DateInput
          id={`${baseId}-end-date`}
          label="End Date"
          value={value.endDate ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              endDate: e.target.value || null,
            })
          }
          min={value.startDate}
          disabled={disabled}
          readOnly={readOnly}
          {...(validation.errors.endDate ? { error: validation.errors.endDate } : {})}
        />
      )}

      {value.endMode === "COUNT" && (
        <NumberInput
          id={`${baseId}-end-count`}
          label="Total Occurrences"
          value={value.endCount ?? 1}
          onChange={(e) => {
            const raw = Number(e.target.value);
            onChange({
              ...value,
              endCount: raw >= 1 ? raw : 1,
            });
          }}
          min={1}
          max={999}
          disabled={disabled}
          readOnly={readOnly}
          {...(validation.errors.endCount ? { error: validation.errors.endCount } : {})}
        />
      )}

      <div className="lifeos-recurrence-editor__summary-card">
        <div className="lifeos-recurrence-editor__summary-title">
          <Icon icon={RefreshCw} size="sm" decorative />
          <span>Rule Summary</span>
        </div>
        <div className="lifeos-recurrence-editor__summary-text">{summaryText}</div>
      </div>

      {nextOccurrences.length > 0 && (
        <div className="lifeos-recurrence-editor__preview-card">
          <div className="lifeos-recurrence-editor__preview-title">
            <Icon icon={Calendar} size="sm" decorative />
            <span>Next Occurrences Preview ({nextOccurrences.length})</span>
          </div>
          <ul className="lifeos-recurrence-editor__preview-list">
            {nextOccurrences.map((date, idx) => (
              <li key={`${date}-${idx}`} className="lifeos-recurrence-editor__preview-item">
                {date}
              </li>
            ))}
          </ul>
        </div>
      )}

      {effectiveError && (
        <span id={ids.errorId} className="lifeos-field__error" role="alert">
          {effectiveError}
        </span>
      )}
    </fieldset>
  );
}
