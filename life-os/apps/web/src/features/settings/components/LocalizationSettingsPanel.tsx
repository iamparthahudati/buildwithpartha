import { useMemo, useState, type FormEvent } from "react";

import { Alert } from "@components/feedback";
import { Combobox, FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Button, Select, Surface, Caption, Heading, Metric, Text } from "@components/ui";
import { detectBrowserTimezone, getAvailableTimezones } from "@features/onboarding";
import {
  computeFormatsPreview,
  resolveLocalizationFieldErrors,
  useUpdateUserProfile,
  validateLocalizationForm,
  type LocalizationFormErrors,
  type UserProfileResponse,
} from "@features/user";

export interface LocalizationSettingsPanelProps {
  readonly profile: UserProfileResponse;
}

const SUPPORTED_LOCALES = [
  { value: "en-IN", label: "English (India) — en-IN" },
  { value: "en-US", label: "English (United States) — en-US" },
  { value: "en-GB", label: "English (United Kingdom) — en-GB" },
  { value: "en-AU", label: "English (Australia) — en-AU" },
  { value: "en-CA", label: "English (Canada) — en-CA" },
];

const WEEK_START_OPTIONS = [
  { value: "1", label: "Monday" },
  { value: "7", label: "Sunday" },
  { value: "6", label: "Saturday" },
];

export function LocalizationSettingsPanel({ profile }: LocalizationSettingsPanelProps) {
  const [timeZone, setTimeZone] = useState(profile.timeZone);
  const [locale, setLocale] = useState(profile.locale);
  const [weekStart, setWeekStart] = useState(profile.weekStart);
  const [tzQuery, setTzQuery] = useState("");
  const [errors, setErrors] = useState<LocalizationFormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateProfileMutation = useUpdateUserProfile();

  const allTimezones = useMemo(() => getAvailableTimezones(), []);
  const filteredTimezones = useMemo(() => {
    const q = tzQuery.trim().toLowerCase();
    if (!q) return allTimezones;
    return allTimezones.filter(
      (tz) => tz.label.toLowerCase().includes(q) || tz.value.toLowerCase().includes(q),
    );
  }, [allTimezones, tzQuery]);

  const browserTimezone = useMemo(() => detectBrowserTimezone(), []);

  const formatsPreview = useMemo(
    () => computeFormatsPreview(timeZone, locale, weekStart),
    [timeZone, locale, weekStart],
  );

  const isDirty =
    timeZone !== profile.timeZone || locale !== profile.locale || weekStart !== profile.weekStart;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    const validationErrors = validateLocalizationForm({ timeZone, locale, weekStart });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    updateProfileMutation.mutate(
      {
        displayName: profile.displayName,
        timeZone,
        locale,
        weekStart,
      },
      {
        onSuccess: () => {
          setSuccessMessage("Localization settings updated.");
        },
        onError: (error) => {
          const resolved = resolveLocalizationFieldErrors(error);
          if (Object.keys(resolved).length > 0) {
            setErrors(resolved);
          } else {
            setErrors({ timeZone: error.message || "Failed to update localization settings." });
          }
        },
      },
    );
  };

  return (
    <div className="lifeos-settings-panel" data-testid="localization-settings-panel">
      <div className="lifeos-settings-panel-header">
        <Heading level={2} size="md">
          Localization
        </Heading>
        <Text tone="secondary">
          Set your timezone, locale, and week start day. Dates and times update across LifeOS
          immediately.
        </Text>
      </div>

      {successMessage && (
        <Alert tone="success" heading="Success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {timeZone !== profile.timeZone && (
        <Alert tone="warning" heading="Timezone change notice">
          Changing your timezone recalculates how scheduled dates and times display throughout
          LifeOS immediately.
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="lifeos-settings-form">
        <FormFieldGroup>
          <FormErrorSummary title="Please resolve the following issue:" />

          <div className="lifeos-settings-field">
            <Combobox
              id="timeZone"
              label="Timezone"
              description="IANA timezone used for daily boundaries, scheduled reminders, and review periods."
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
              placeholder="Search or select timezone..."
              noResultsMessage="No matching timezones found."
            />
            <div className="lifeos-timezone-shortcuts">
              {browserTimezone && browserTimezone !== timeZone && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimeZone(browserTimezone)}
                >
                  Use device timezone ({browserTimezone})
                </Button>
              )}
              {timeZone !== "UTC" && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setTimeZone("UTC")}>
                  Use UTC
                </Button>
              )}
            </div>
          </div>

          <div className="lifeos-settings-field">
            <FormField
              name="locale"
              label="Display locale"
              required
              description="Governs number, date, and time formatting conventions."
              {...(errors.locale ? { error: errors.locale } : {})}
            >
              {(field) => (
                <Select
                  {...field}
                  value={locale}
                  onChange={(e) => {
                    setLocale(e.target.value);
                    if (errors.locale) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.locale;
                        return next;
                      });
                    }
                  }}
                  options={SUPPORTED_LOCALES}
                />
              )}
            </FormField>
          </div>

          <div className="lifeos-settings-field">
            <FormField
              name="weekStart"
              label="First day of the week"
              required
              description="Sets the starting day for week plans, sprint views, and weekly review rituals."
              {...(errors.weekStart ? { error: errors.weekStart } : {})}
            >
              {(field) => (
                <Select
                  {...field}
                  value={String(weekStart)}
                  onChange={(e) => {
                    setWeekStart(Number(e.target.value));
                    if (errors.weekStart) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.weekStart;
                        return next;
                      });
                    }
                  }}
                  options={WEEK_START_OPTIONS}
                />
              )}
            </FormField>
          </div>

          {/* Live Preview Card */}
          <Surface tone="default" padding="md" className="lifeos-live-preview-card">
            <Heading level={3} size="sm">
              Live date and time preview
            </Heading>
            <Caption tone="secondary">
              Calculated using timezone <Text weight="semibold">{timeZone}</Text> and locale{" "}
              <Text weight="semibold">{locale}</Text>:
            </Caption>

            <div className="lifeos-preview-grid">
              <div className="lifeos-preview-item">
                <Metric value={formatsPreview.todayDate}>Local date</Metric>
              </div>
              <div className="lifeos-preview-item">
                <Caption tone="secondary">Local time</Caption>
                <Text weight="medium">{formatsPreview.currentTime}</Text>
              </div>
              <div className="lifeos-preview-item">
                <Caption tone="secondary">Relative format example</Caption>
                <Text weight="medium">{formatsPreview.relativeExample}</Text>
              </div>
              <div className="lifeos-preview-item">
                <Caption tone="secondary">Number format example</Caption>
                <Text weight="medium">{formatsPreview.numberExample}</Text>
              </div>
              <div className="lifeos-preview-item">
                <Caption tone="secondary">Week starts on</Caption>
                <Text weight="medium">{formatsPreview.weekStartName}</Text>
              </div>
            </div>
          </Surface>

          <div className="lifeos-settings-actions">
            <Button
              type="submit"
              variant="primary"
              loading={updateProfileMutation.isPending}
              disabled={!isDirty && !updateProfileMutation.isPending}
            >
              Save changes
            </Button>
          </div>
        </FormFieldGroup>
      </form>
    </div>
  );
}
