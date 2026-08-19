import { useCallback, useRef, useState, type FormEvent } from "react";

import { FormErrorSummary, FormFieldGroup } from "@components/forms";
import { Button, Checkbox, Heading, NumberInput, Text, TimeInput } from "@components/ui";

import { resolvePlanningDefaultsFieldErrors } from "../model/onboardingFieldErrors";
import {
  validatePlanningDefaultsForm,
  type PlanningDefaultsFormErrors,
  type PlanningDefaultsFormValues,
} from "../model/onboardingValidation";

const DAYS_OF_WEEK = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

export interface PlanningDefaultsStepProps {
  readonly initialWorkingDays?: readonly number[] | undefined;
  readonly initialWorkStartTime?: string | null | undefined;
  readonly initialWorkEndTime?: string | null | undefined;
  readonly initialOvernightSchedule?: boolean | undefined;
  readonly initialDailyFocusTargetMinutes?: number | null | undefined;
  readonly initialFocusDurationMinutes?: number | undefined;
  readonly initialBreakDurationMinutes?: number | undefined;
  readonly isSubmitting: boolean;
  readonly onBack: () => void;
  readonly onSkip: () => Promise<void> | void;
  readonly onSubmit: (values: PlanningDefaultsFormValues) => Promise<void> | void;
}

export function PlanningDefaultsStep({
  initialWorkingDays = [1, 2, 3, 4, 5],
  initialWorkStartTime = "09:00",
  initialWorkEndTime = "17:00",
  initialOvernightSchedule = false,
  initialDailyFocusTargetMinutes = null,
  initialFocusDurationMinutes = 25,
  initialBreakDurationMinutes = 5,
  isSubmitting,
  onBack,
  onSkip,
  onSubmit,
}: PlanningDefaultsStepProps) {
  const [workingDays, setWorkingDays] = useState<readonly number[]>(initialWorkingDays);
  const [workStartTime, setWorkStartTime] = useState<string>(initialWorkStartTime ?? "09:00");
  const [workEndTime, setWorkEndTime] = useState<string>(initialWorkEndTime ?? "17:00");
  const [overnightSchedule, setOvernightSchedule] = useState<boolean>(initialOvernightSchedule);
  const [dailyFocusTarget, setDailyFocusTarget] = useState<number | "">(
    initialDailyFocusTargetMinutes ?? "",
  );
  const [focusDuration, setFocusDuration] = useState<number | "">(initialFocusDurationMinutes);
  const [breakDuration, setBreakDuration] = useState<number | "">(initialBreakDurationMinutes);
  const [errors, setErrors] = useState<PlanningDefaultsFormErrors>({});

  const summaryNodeRef = useRef<HTMLDivElement | null>(null);
  const pendingSummaryFocusRef = useRef(false);
  const summaryRefCallback = useCallback((node: HTMLDivElement | null) => {
    summaryNodeRef.current = node;
    if (node !== null && pendingSummaryFocusRef.current) {
      pendingSummaryFocusRef.current = false;
      node.focus();
    }
  }, []);

  function applyFailure(nextErrors: PlanningDefaultsFormErrors) {
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (summaryNodeRef.current !== null) {
        summaryNodeRef.current.focus();
      } else {
        pendingSummaryFocusRef.current = true;
      }
    }
  }

  function toggleWorkingDay(day: number) {
    setWorkingDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort();
      return next;
    });
    if (errors.workingDays) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.workingDays;
        return next;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: PlanningDefaultsFormValues = {
      workingDays,
      workStartTime,
      workEndTime,
      overnightSchedule,
      dailyFocusTargetMinutes: dailyFocusTarget,
      focusDurationMinutes: focusDuration,
      breakDurationMinutes: breakDuration,
    };
    const fieldErrors = validatePlanningDefaultsForm(values);

    if (Object.keys(fieldErrors).length > 0) {
      applyFailure(fieldErrors);
      return;
    }

    setErrors({});
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      const serverFieldErrors = resolvePlanningDefaultsFieldErrors(err);
      if (Object.keys(serverFieldErrors).length > 0) {
        applyFailure(serverFieldErrors);
      }
    }
  }

  return (
    <div className="lifeos-onboarding-step">
      <div className="lifeos-onboarding-step__header">
        <Heading level={1} size="xl">
          Planning defaults
        </Heading>
        <Text size="md" tone="secondary">
          Set your typical working schedule and focus rhythm. All choices are optional and can be
          updated anytime in Settings.
        </Text>
      </div>

      <form className="lifeos-onboarding-step__form" onSubmit={handleSubmit} noValidate>
        <FormFieldGroup>
          <FormErrorSummary ref={summaryRefCallback} title="Check your planning defaults" />

          <fieldset className="lifeos-onboarding-step__fieldset">
            <legend className="lifeos-onboarding-step__legend">
              <Text size="sm" weight="semibold">
                Working days
              </Text>
            </legend>
            <Text size="xs" tone="muted">
              Select the days you typically plan work blocks.
            </Text>
            {errors.workingDays && (
              <Text size="xs" tone="danger">
                {errors.workingDays}
              </Text>
            )}
            <div className="lifeos-onboarding-step__days-grid">
              {DAYS_OF_WEEK.map((day) => (
                <Checkbox
                  key={day.value}
                  label={day.label}
                  checked={workingDays.includes(day.value)}
                  onChange={() => toggleWorkingDay(day.value)}
                />
              ))}
            </div>
          </fieldset>

          <div className="lifeos-onboarding-step__time-grid">
            <TimeInput
              id="workStartTime"
              label="Work start time"
              description="Typical start of your workday."
              {...(errors.workStartTime ? { error: errors.workStartTime } : {})}
              value={workStartTime}
              onChange={(e) => setWorkStartTime(e.target.value)}
            />

            <TimeInput
              id="workEndTime"
              label="Work end time"
              description="Typical end of your workday."
              {...(errors.workEndTime ? { error: errors.workEndTime } : {})}
              value={workEndTime}
              onChange={(e) => setWorkEndTime(e.target.value)}
            />
          </div>

          <Checkbox
            id="overnightSchedule"
            label="Schedule ends next day (overnight)"
            description="Enable if your work hours cross midnight into the next day."
            checked={overnightSchedule}
            onChange={(e) => setOvernightSchedule(e.target.checked)}
          />

          <NumberInput
            id="dailyFocusTargetMinutes"
            label="Daily focus target"
            description="Optional target for daily deep work (e.g. 240 for 4 hours)."
            {...(errors.dailyFocusTargetMinutes ? { error: errors.dailyFocusTargetMinutes } : {})}
            unit="min"
            min={1}
            max={1440}
            value={dailyFocusTarget}
            onChange={(e) => {
              const val = e.target.value;
              setDailyFocusTarget(val === "" ? "" : Number(val));
            }}
            placeholder="e.g. 240"
          />

          <div className="lifeos-onboarding-step__time-grid">
            <NumberInput
              id="focusDurationMinutes"
              label="Focus block duration"
              description="Default length for focused sprints."
              {...(errors.focusDurationMinutes ? { error: errors.focusDurationMinutes } : {})}
              unit="min"
              min={1}
              max={720}
              value={focusDuration}
              onChange={(e) => {
                const val = e.target.value;
                setFocusDuration(val === "" ? "" : Number(val));
              }}
            />

            <NumberInput
              id="breakDurationMinutes"
              label="Break duration"
              description="Default rest interval between sprints."
              {...(errors.breakDurationMinutes ? { error: errors.breakDurationMinutes } : {})}
              unit="min"
              min={1}
              max={180}
              value={breakDuration}
              onChange={(e) => {
                const val = e.target.value;
                setBreakDuration(val === "" ? "" : Number(val));
              }}
            />
          </div>

          <div className="lifeos-onboarding-step__actions lifeos-onboarding-step__actions--split">
            <Button type="button" variant="secondary" onClick={onBack} disabled={isSubmitting}>
              Back
            </Button>
            <div className="lifeos-onboarding-step__actions-primary">
              <Button type="button" variant="ghost" onClick={onSkip} disabled={isSubmitting}>
                Skip for now
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                Save and continue
              </Button>
            </div>
          </div>
        </FormFieldGroup>
      </form>
    </div>
  );
}
