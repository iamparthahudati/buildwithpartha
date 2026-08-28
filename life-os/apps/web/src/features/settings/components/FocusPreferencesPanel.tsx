import { useState, type ChangeEvent, type FormEvent } from "react";

import { Alert, ErrorState } from "@components/feedback";
import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Button, Checkbox, Heading, NumberInput, Skeleton, Text } from "@components/ui";
import {
  useUpdateUserPreferences,
  useUserPreferences,
  type UpdateUserPreferencesRequest,
} from "@features/user";
import type { PlanningDefaultsDto } from "@features/onboarding";

interface FocusPreferenceErrors {
  readonly dailyFocusTargetMinutes?: string;
  readonly focusDurationMinutes?: string;
  readonly breakDurationMinutes?: string;
  readonly longBreakDurationMinutes?: string;
  readonly focusSessionsBeforeLongBreak?: string;
}

interface FocusPreferenceFormValues {
  readonly dailyFocusTargetMinutes: string;
  readonly focusDurationMinutes: string;
  readonly breakDurationMinutes: string;
  readonly longBreakDurationMinutes: string;
  readonly focusSessionsBeforeLongBreak: string;
  readonly autoStartBreaks: boolean;
  readonly autoStartFocusSessions: boolean;
  readonly soundEnabled: boolean;
  readonly browserNotificationsEnabled: boolean;
}

function initialValues(preferences: PlanningDefaultsDto): FocusPreferenceFormValues {
  return {
    dailyFocusTargetMinutes:
      preferences.dailyFocusTargetMinutes === null
        ? ""
        : String(preferences.dailyFocusTargetMinutes),
    focusDurationMinutes: String(preferences.focusDurationMinutes),
    breakDurationMinutes: String(preferences.breakDurationMinutes),
    longBreakDurationMinutes: String(preferences.longBreakDurationMinutes),
    focusSessionsBeforeLongBreak: String(preferences.focusSessionsBeforeLongBreak),
    autoStartBreaks: preferences.autoStartBreaks,
    autoStartFocusSessions: preferences.autoStartFocusSessions,
    soundEnabled: preferences.soundEnabled,
    browserNotificationsEnabled: preferences.browserNotificationsEnabled,
  };
}

function parseBoundedInteger(
  value: string,
  min: number,
  max: number,
  message: string,
): { readonly value?: number; readonly error?: string } {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? { value: parsed }
    : { error: message };
}

function validate(values: FocusPreferenceFormValues): FocusPreferenceErrors {
  const target: { readonly value?: number; readonly error?: string } =
    values.dailyFocusTargetMinutes === ""
      ? {}
      : parseBoundedInteger(
          values.dailyFocusTargetMinutes,
          1,
          1440,
          "Choose a daily focus target from 1 to 1,440 minutes, or leave it blank.",
        );
  const focus = parseBoundedInteger(
    values.focusDurationMinutes,
    1,
    1440,
    "Choose a focus duration from 1 to 1,440 minutes.",
  );
  const shortBreak = parseBoundedInteger(
    values.breakDurationMinutes,
    1,
    1440,
    "Choose a break duration from 1 to 1,440 minutes.",
  );
  const longBreak = parseBoundedInteger(
    values.longBreakDurationMinutes,
    1,
    180,
    "Choose a long break duration from 1 to 180 minutes.",
  );
  const cycle = parseBoundedInteger(
    values.focusSessionsBeforeLongBreak,
    1,
    12,
    "Choose from 1 to 12 Focus Sessions per cycle.",
  );

  return {
    ...(target.error ? { dailyFocusTargetMinutes: target.error } : {}),
    ...(focus.error ? { focusDurationMinutes: focus.error } : {}),
    ...(shortBreak.error ? { breakDurationMinutes: shortBreak.error } : {}),
    ...(longBreak.error ? { longBreakDurationMinutes: longBreak.error } : {}),
    ...(cycle.error ? { focusSessionsBeforeLongBreak: cycle.error } : {}),
  };
}

export function FocusPreferencesPanel() {
  const preferences = useUserPreferences();

  if (preferences.isLoading) {
    return (
      <div className="lifeos-settings-panel" data-testid="focus-preferences-loading">
        <Skeleton shape="block" height="320px" />
      </div>
    );
  }

  if (preferences.error || !preferences.data) {
    return (
      <div className="lifeos-settings-panel" data-testid="focus-preferences-error">
        <ErrorState
          scope="region"
          title="Couldn't load focus preferences"
          description="We couldn't retrieve your Focus Mode preferences from the server."
          onRetry={() => void preferences.refetch()}
        />
      </div>
    );
  }

  return <FocusPreferencesForm preferences={preferences.data.planningDefaults} />;
}

function FocusPreferencesForm({ preferences }: { readonly preferences: PlanningDefaultsDto }) {
  const [values, setValues] = useState(() => initialValues(preferences));
  const [errors, setErrors] = useState<FocusPreferenceErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const updatePreferences = useUpdateUserPreferences();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues(preferences));

  const setNumberValue =
    (field: keyof FocusPreferenceFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };

  const setBooleanValue =
    (field: keyof FocusPreferenceFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.checked }));
    };

  const handleBrowserNotifications = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.checked) {
      setValues((current) => ({ ...current, browserNotificationsEnabled: false }));
      setNotificationMessage(null);
      return;
    }

    if (typeof Notification === "undefined") {
      setNotificationMessage("Browser notifications are not available in this browser.");
      return;
    }

    let permission: NotificationPermission;
    try {
      permission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
    } catch {
      setNotificationMessage("This browser couldn't confirm notification permission.");
      return;
    }
    if (permission !== "granted") {
      setNotificationMessage(
        permission === "denied"
          ? "Browser notifications are blocked. Change the permission in your browser settings before enabling them here."
          : "Browser notification permission was not granted.",
      );
      return;
    }

    setNotificationMessage(null);
    setValues((current) => ({ ...current, browserNotificationsEnabled: true }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);
    setSaveError(null);
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const request: UpdateUserPreferencesRequest = {
      workingDays: preferences.workingDays,
      workStartTime: preferences.workStartTime,
      workEndTime: preferences.workEndTime,
      overnightSchedule: preferences.overnightSchedule,
      dailyFocusTargetMinutes:
        values.dailyFocusTargetMinutes === "" ? null : Number(values.dailyFocusTargetMinutes),
      focusDurationMinutes: Number(values.focusDurationMinutes),
      breakDurationMinutes: Number(values.breakDurationMinutes),
      longBreakDurationMinutes: Number(values.longBreakDurationMinutes),
      focusSessionsBeforeLongBreak: Number(values.focusSessionsBeforeLongBreak),
      autoStartBreaks: values.autoStartBreaks,
      autoStartFocusSessions: values.autoStartFocusSessions,
      soundEnabled: values.soundEnabled,
      browserNotificationsEnabled: values.browserNotificationsEnabled,
    };

    updatePreferences
      .mutateAsync(request)
      .then(() => setSuccessMessage("Focus preferences saved."))
      .catch((error: Error) => {
        setSaveError(error.message || "We couldn't save your focus preferences.");
      });
  };

  return (
    <div className="lifeos-settings-panel" data-testid="focus-preferences-panel">
      <div className="lifeos-settings-panel-header">
        <Heading level={2} size="md">
          Focus
        </Heading>
        <Text tone="secondary">
          Choose your default Focus Session cycle. These settings are personal defaults, not
          universal targets.
        </Text>
      </div>

      {successMessage ? (
        <Alert
          tone="success"
          heading="Focus preferences saved"
          onDismiss={() => setSuccessMessage(null)}
        >
          New Focus Sessions use these defaults. An active session is unchanged.
        </Alert>
      ) : null}
      {notificationMessage ? (
        <Alert
          tone="warning"
          heading="Check browser notifications"
          onDismiss={() => setNotificationMessage(null)}
        >
          {notificationMessage}
        </Alert>
      ) : null}
      {saveError ? (
        <Alert
          tone="danger"
          heading="Couldn't save focus preferences"
          onDismiss={() => setSaveError(null)}
        >
          {saveError}
        </Alert>
      ) : null}

      <form className="lifeos-settings-form" noValidate onSubmit={handleSubmit}>
        <FormFieldGroup>
          <FormErrorSummary title="Check your focus preferences" />

          <div className="lifeos-focus-preferences-grid">
            <FormField
              name="dailyFocusTargetMinutes"
              label="Daily focus target (optional)"
              description="Used when the day has no planned Focus Time Blocks."
              {...(errors.dailyFocusTargetMinutes ? { error: errors.dailyFocusTargetMinutes } : {})}
            >
              {(field) => (
                <NumberInput
                  {...field}
                  value={values.dailyFocusTargetMinutes}
                  min={1}
                  max={1440}
                  unit="minutes"
                  onChange={setNumberValue("dailyFocusTargetMinutes")}
                />
              )}
            </FormField>
            <FormField
              name="focusDurationMinutes"
              label="Focus duration"
              description="Default length of a Focus Session."
              {...(errors.focusDurationMinutes ? { error: errors.focusDurationMinutes } : {})}
            >
              {(field) => (
                <NumberInput
                  {...field}
                  value={values.focusDurationMinutes}
                  min={1}
                  max={1440}
                  unit="minutes"
                  onChange={setNumberValue("focusDurationMinutes")}
                />
              )}
            </FormField>
            <FormField
              name="breakDurationMinutes"
              label="Break duration"
              description="Default short break after a Focus Session."
              {...(errors.breakDurationMinutes ? { error: errors.breakDurationMinutes } : {})}
            >
              {(field) => (
                <NumberInput
                  {...field}
                  value={values.breakDurationMinutes}
                  min={1}
                  max={1440}
                  unit="minutes"
                  onChange={setNumberValue("breakDurationMinutes")}
                />
              )}
            </FormField>
            <FormField
              name="longBreakDurationMinutes"
              label="Long break duration"
              description="Longer break offered at the end of a cycle."
              {...(errors.longBreakDurationMinutes
                ? { error: errors.longBreakDurationMinutes }
                : {})}
            >
              {(field) => (
                <NumberInput
                  {...field}
                  value={values.longBreakDurationMinutes}
                  min={1}
                  max={180}
                  unit="minutes"
                  onChange={setNumberValue("longBreakDurationMinutes")}
                />
              )}
            </FormField>
            <FormField
              name="focusSessionsBeforeLongBreak"
              label="Focus Sessions per cycle"
              description="Completed Focus Sessions before a long break is offered."
              {...(errors.focusSessionsBeforeLongBreak
                ? { error: errors.focusSessionsBeforeLongBreak }
                : {})}
            >
              {(field) => (
                <NumberInput
                  {...field}
                  value={values.focusSessionsBeforeLongBreak}
                  min={1}
                  max={12}
                  unit="sessions"
                  onChange={setNumberValue("focusSessionsBeforeLongBreak")}
                />
              )}
            </FormField>
          </div>

          <fieldset className="lifeos-focus-preferences-options">
            <legend className="lifeos-visually-hidden">Focus cycle behavior</legend>
            <Checkbox
              label="Start breaks automatically"
              description="Use this preference when automatic cycle transitions are available."
              checked={values.autoStartBreaks}
              onChange={setBooleanValue("autoStartBreaks")}
            />
            <Checkbox
              label="Start Focus Sessions automatically"
              description="Use this preference after a break ends when automatic cycle transitions are available."
              checked={values.autoStartFocusSessions}
              onChange={setBooleanValue("autoStartFocusSessions")}
            />
            <Checkbox
              label="Play a sound when a phase ends"
              description="Play a local sound in this browser when supported."
              checked={values.soundEnabled}
              onChange={setBooleanValue("soundEnabled")}
            />
            <Checkbox
              label="Show browser notifications"
              description="Ask this browser for permission only when you enable this setting."
              checked={values.browserNotificationsEnabled}
              onChange={(event) => void handleBrowserNotifications(event)}
            />
          </fieldset>

          <div className="lifeos-settings-actions">
            <Button
              type="submit"
              variant="primary"
              loading={updatePreferences.isPending}
              disabled={!isDirty || updatePreferences.isPending}
            >
              Save changes
            </Button>
          </div>
        </FormFieldGroup>
      </form>
    </div>
  );
}
