import { useState } from "react";
import { Button, Switch, TimeInput, Text, Skeleton } from "@components/ui";
import { Alert, ErrorState } from "@components/feedback";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../hooks/useNotifications";
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
} from "../model/notifications";

export interface NotificationPreferencesPanelProps {
  readonly className?: string;
}

const QUIET_HOURS_TIME_REGEX = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

interface NotificationPreferencesFormProps {
  readonly initialPreferences: NotificationPreferences;
}

function NotificationPreferencesForm({ initialPreferences }: NotificationPreferencesFormProps) {
  const updateMutation = useUpdateNotificationPreferences();

  const [formState, setFormState] = useState<UpdateNotificationPreferencesRequest>({
    quietHoursEnabled: initialPreferences.quietHoursEnabled,
    quietHoursStart: initialPreferences.quietHoursStart,
    quietHoursEnd: initialPreferences.quietHoursEnd,
    dueRemindersEnabled: initialPreferences.dueRemindersEnabled,
    overdueRemindersEnabled: initialPreferences.overdueRemindersEnabled,
    timeBlockRemindersEnabled: initialPreferences.timeBlockRemindersEnabled,
    focusRemindersEnabled: initialPreferences.focusRemindersEnabled,
    habitRemindersEnabled: initialPreferences.habitRemindersEnabled,
    reviewPromptsEnabled: initialPreferences.reviewPromptsEnabled,
    securityNoticesEnabled: initialPreferences.securityNoticesEnabled,
    systemNoticesEnabled: initialPreferences.systemNoticesEnabled,
    inAppChannelEnabled: initialPreferences.inAppChannelEnabled,
    emailChannelEnabled: initialPreferences.emailChannelEnabled,
    pushChannelEnabled: initialPreferences.pushChannelEnabled,
  });

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  const handleToggle = (key: keyof UpdateNotificationPreferencesRequest) => {
    setFormState((prev) => ({ ...prev, [key]: !prev[key] }));
    setFeedback(null);
  };

  const handleTimeChange = (key: "quietHoursStart" | "quietHoursEnd", value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (formState.quietHoursEnabled) {
      if (!QUIET_HOURS_TIME_REGEX.test(formState.quietHoursStart)) {
        setFeedback({
          type: "error",
          message: "Quiet hours start time must be in HH:mm 24-hour format.",
        });
        return;
      }
      if (!QUIET_HOURS_TIME_REGEX.test(formState.quietHoursEnd)) {
        setFeedback({
          type: "error",
          message: "Quiet hours end time must be in HH:mm 24-hour format.",
        });
        return;
      }
    }

    updateMutation.mutate(formState, {
      onSuccess: () => {
        setFeedback({
          type: "success",
          message: "Notification preferences updated successfully.",
        });
      },
      onError: (err) => {
        setFeedback({
          type: "error",
          message: err.message || "Failed to update notification preferences.",
        });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} data-testid="notification-preferences-panel">
      <div className="lifeos-settings-panel-header">
        <Text weight="bold" size="lg">
          Notification preferences
        </Text>
        <Text tone="secondary" size="sm">
          Customize quiet hours, notification categories, and delivery channels.
        </Text>
      </div>

      {feedback ? (
        <Alert
          tone={feedback.type === "success" ? "success" : "danger"}
          heading={feedback.type === "success" ? "Preferences Saved" : "Error"}
        >
          {feedback.message}
        </Alert>
      ) : null}

      <div className="lifeos-settings-section">
        <Text weight="medium" size="md">
          Quiet hours
        </Text>
        <Switch
          label="Enable quiet hours"
          description="Suppress non-essential notifications during specified hours."
          checked={formState.quietHoursEnabled}
          onChange={() => handleToggle("quietHoursEnabled")}
        />

        {formState.quietHoursEnabled ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "var(--lifeos-space-4)",
              marginTop: "var(--lifeos-space-2)",
            }}
          >
            <TimeInput
              label="Quiet hours start"
              value={formState.quietHoursStart}
              onChange={(e) => handleTimeChange("quietHoursStart", e.target.value)}
            />
            <TimeInput
              label="Quiet hours end"
              value={formState.quietHoursEnd}
              onChange={(e) => handleTimeChange("quietHoursEnd", e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div className="lifeos-settings-section">
        <Text weight="medium" size="md">
          Category preferences
        </Text>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-3)" }}>
          <Switch
            label="Due task reminders"
            checked={formState.dueRemindersEnabled}
            onChange={() => handleToggle("dueRemindersEnabled")}
          />
          <Switch
            label="Overdue task reminders"
            checked={formState.overdueRemindersEnabled}
            onChange={() => handleToggle("overdueRemindersEnabled")}
          />
          <Switch
            label="Time block reminders"
            checked={formState.timeBlockRemindersEnabled}
            onChange={() => handleToggle("timeBlockRemindersEnabled")}
          />
          <Switch
            label="Focus session reminders"
            checked={formState.focusRemindersEnabled}
            onChange={() => handleToggle("focusRemindersEnabled")}
          />
          <Switch
            label="Habit reminders"
            checked={formState.habitRemindersEnabled}
            onChange={() => handleToggle("habitRemindersEnabled")}
          />
          <Switch
            label="Review prompts"
            checked={formState.reviewPromptsEnabled}
            onChange={() => handleToggle("reviewPromptsEnabled")}
          />
          <Switch
            label="Security notices"
            description="Important account security alerts."
            checked={formState.securityNoticesEnabled}
            onChange={() => handleToggle("securityNoticesEnabled")}
          />
          <Switch
            label="System notices"
            checked={formState.systemNoticesEnabled}
            onChange={() => handleToggle("systemNoticesEnabled")}
          />
        </div>
      </div>

      <div className="lifeos-settings-section">
        <Text weight="medium" size="md">
          Delivery channels
        </Text>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-3)" }}>
          <Switch
            label="In-app notifications"
            checked={formState.inAppChannelEnabled}
            onChange={() => handleToggle("inAppChannelEnabled")}
          />
          <Switch
            label="Email notifications"
            checked={formState.emailChannelEnabled}
            onChange={() => handleToggle("emailChannelEnabled")}
          />
          <Switch
            label="Push notifications"
            checked={formState.pushChannelEnabled}
            onChange={() => handleToggle("pushChannelEnabled")}
          />
        </div>
      </div>

      <div className="lifeos-settings-actions">
        <Button type="submit" loading={updateMutation.isPending}>
          Save preferences
        </Button>
      </div>
    </form>
  );
}

export function NotificationPreferencesPanel({ className }: NotificationPreferencesPanelProps) {
  const preferencesQuery = useNotificationPreferences();

  if (preferencesQuery.isLoading) {
    return (
      <div className="lifeos-settings-panel" data-testid="notification-preferences-loading">
        <Skeleton shape="block" height="200px" />
        <Skeleton shape="block" height="200px" />
      </div>
    );
  }

  if (preferencesQuery.isError) {
    return (
      <ErrorState
        scope="region"
        title="Couldn't load notification preferences"
        description="We couldn't retrieve your notification preferences. Please try again."
        onRetry={() => preferencesQuery.refetch()}
        data-testid="notification-preferences-error"
      />
    );
  }

  if (!preferencesQuery.data) {
    return null;
  }

  const rootClasses = ["lifeos-settings-panel", className].filter(Boolean).join(" ");

  return (
    <div className={rootClasses}>
      <NotificationPreferencesForm initialPreferences={preferencesQuery.data} />
    </div>
  );
}
