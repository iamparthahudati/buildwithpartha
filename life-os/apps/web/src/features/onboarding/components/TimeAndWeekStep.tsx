import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";

import { Combobox, FormErrorSummary, FormFieldGroup } from "@components/forms";
import { Button, Heading, Select, Surface, Text } from "@components/ui";

import { resolveTimeAndWeekFieldErrors } from "../model/onboardingFieldErrors";
import {
  validateTimeAndWeekForm,
  type TimeAndWeekFormErrors,
  type TimeAndWeekFormValues,
} from "../model/onboardingValidation";
import {
  detectBrowserTimezone,
  formatTimezonePreview,
  getAvailableTimezones,
} from "../model/timezones";

const WEEK_START_OPTIONS = [
  { value: "1", label: "Monday (Standard)" },
  { value: "7", label: "Sunday" },
  { value: "6", label: "Saturday" },
] as const;

const LOCALE_OPTIONS = [
  { value: "en-US", label: "English (United States) — MM/DD/YYYY" },
  { value: "en-GB", label: "English (United Kingdom) — DD/MM/YYYY" },
  { value: "en-IN", label: "English (India) — DD/MM/YYYY" },
  { value: "en-CA", label: "English (Canada) — YYYY-MM-DD" },
  { value: "en-AU", label: "English (Australia) — DD/MM/YYYY" },
] as const;

export interface TimeAndWeekStepProps {
  readonly initialTimeZone: string;
  readonly initialLocale: string;
  readonly initialWeekStart: number;
  readonly isSubmitting: boolean;
  readonly onBack: () => void;
  readonly onSubmit: (values: TimeAndWeekFormValues) => Promise<void> | void;
}

export function TimeAndWeekStep({
  initialTimeZone,
  initialLocale,
  initialWeekStart,
  isSubmitting,
  onBack,
  onSubmit,
}: TimeAndWeekStepProps) {
  const browserTz = useMemo(() => detectBrowserTimezone(), []);
  const [timeZone, setTimeZone] = useState<string>(initialTimeZone || browserTz || "UTC");
  const [locale, setLocale] = useState<string>(initialLocale || "en-US");
  const [weekStart, setWeekStart] = useState<number>(initialWeekStart || 1);
  const [tzQuery, setTzQuery] = useState("");
  const [errors, setErrors] = useState<TimeAndWeekFormErrors>({});

  const allTimezones = useMemo(() => getAvailableTimezones(), []);
  const filteredTimezones = useMemo(() => {
    const q = tzQuery.trim().toLowerCase();
    if (!q) return allTimezones;
    return allTimezones.filter(
      (tz) => tz.label.toLowerCase().includes(q) || tz.value.toLowerCase().includes(q),
    );
  }, [allTimezones, tzQuery]);

  const preview = useMemo(() => formatTimezonePreview(timeZone, locale), [timeZone, locale]);

  const summaryNodeRef = useRef<HTMLDivElement | null>(null);
  const pendingSummaryFocusRef = useRef(false);
  const summaryRefCallback = useCallback((node: HTMLDivElement | null) => {
    summaryNodeRef.current = node;
    if (node !== null && pendingSummaryFocusRef.current) {
      pendingSummaryFocusRef.current = false;
      node.focus();
    }
  }, []);

  function applyFailure(nextErrors: TimeAndWeekFormErrors) {
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (summaryNodeRef.current !== null) {
        summaryNodeRef.current.focus();
      } else {
        pendingSummaryFocusRef.current = true;
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: TimeAndWeekFormValues = {
      timeZone,
      locale,
      weekStart,
    };
    const fieldErrors = validateTimeAndWeekForm(values);

    if (Object.keys(fieldErrors).length > 0) {
      applyFailure(fieldErrors);
      return;
    }

    setErrors({});
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      const serverFieldErrors = resolveTimeAndWeekFieldErrors(err);
      if (Object.keys(serverFieldErrors).length > 0) {
        applyFailure(serverFieldErrors);
      }
    }
  }

  return (
    <div className="lifeos-onboarding-step">
      <div className="lifeos-onboarding-step__header">
        <Heading level={1} size="xl">
          Time and week
        </Heading>
        <Text size="md" tone="secondary">
          LifeOS uses your confirmed timezone to interpret dates, schedules, and daily planning
          truthfully.
        </Text>
      </div>

      <form className="lifeos-onboarding-step__form" onSubmit={handleSubmit} noValidate>
        <FormFieldGroup>
          <FormErrorSummary ref={summaryRefCallback} title="Check your time settings" />

          <div className="lifeos-onboarding-step__field-stack">
            <Combobox
              id="timeZone"
              label="Timezone"
              description="Required. Select your local timezone or choose UTC."
              {...(errors.timeZone ? { error: errors.timeZone } : {})}
              options={filteredTimezones}
              query={tzQuery}
              onQueryChange={setTzQuery}
              value={timeZone}
              onValueChange={(val) => {
                if (val) {
                  setTimeZone(val);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.timeZone;
                    return next;
                  });
                }
              }}
              placeholder="Search timezone (e.g. America/New_York, Asia/Kolkata)"
              noResultsMessage="No matching timezones found."
            />

            <div className="lifeos-onboarding-step__tz-suggestions">
              {browserTz && browserTz !== timeZone && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setTimeZone(browserTz);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.timeZone;
                      return next;
                    });
                  }}
                >
                  Use browser detected ({browserTz})
                </Button>
              )}
              {timeZone !== "UTC" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTimeZone("UTC");
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.timeZone;
                      return next;
                    });
                  }}
                >
                  Use UTC for now
                </Button>
              )}
            </div>
          </div>

          <Surface className="lifeos-onboarding-step__preview-box" tone="muted" padding="md">
            <Text size="xs" weight="medium" tone="secondary">
              Live date & time interpretation
            </Text>
            <div className="lifeos-onboarding-step__preview-grid">
              <div>
                <Text size="xs" tone="muted">
                  Your Today
                </Text>
                <Text size="sm" weight="medium">
                  {preview.formattedToday}
                </Text>
              </div>
              <div>
                <Text size="xs" tone="muted">
                  Current local time
                </Text>
                <Text size="sm" weight="medium">
                  {preview.currentTime} ({timeZone})
                </Text>
              </div>
            </div>
          </Surface>

          <Select
            id="weekStart"
            label="Week starts on"
            description="Used for weekly reviews and planner views."
            {...(errors.weekStart ? { error: errors.weekStart } : {})}
            value={String(weekStart)}
            onChange={(e) => setWeekStart(Number(e.target.value))}
            options={WEEK_START_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />

          <Select
            id="locale"
            label="Display locale & date format"
            description="Formatting conventions for dates and numbers."
            {...(errors.locale ? { error: errors.locale } : {})}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            options={LOCALE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />

          <div className="lifeos-onboarding-step__actions">
            <Button type="button" variant="secondary" onClick={onBack} disabled={isSubmitting}>
              Back
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Save and continue
            </Button>
          </div>
        </FormFieldGroup>
      </form>
    </div>
  );
}
