import { useState, type FormEvent } from "react";

import { Alert } from "@components/feedback";
import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Avatar, Button, TextInput, Heading, Text } from "@components/ui";
import {
  resolveProfileFieldErrors,
  useUpdateUserProfile,
  validateProfileForm,
  type ProfileFormErrors,
  type UserProfileResponse,
} from "@features/user";

export interface ProfileSettingsPanelProps {
  readonly profile: UserProfileResponse;
}

export function ProfileSettingsPanel({ profile }: ProfileSettingsPanelProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateProfileMutation = useUpdateUserProfile();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    const validationErrors = validateProfileForm({ displayName });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    // `mutateAsync().then()/.catch()` rather than `.mutate(vars, { onSuccess,
    // onError })`: verified live against a real backend, the call-time
    // callback form is unreliable. See VerifyEmailScreen/LoginScreen.
    updateProfileMutation
      .mutateAsync({
        displayName: displayName.trim(),
        timeZone: profile.timeZone,
        locale: profile.locale,
        weekStart: profile.weekStart,
      })
      .then(() => {
        setSuccessMessage("Profile settings saved.");
      })
      .catch((error: Error) => {
        const resolved = resolveProfileFieldErrors(error);
        if (Object.keys(resolved).length > 0) {
          setErrors(resolved);
        } else {
          setErrors({ displayName: error.message || "Failed to update profile." });
        }
      });
  };

  const isDirty = displayName !== profile.displayName;

  return (
    <div className="lifeos-settings-panel" data-testid="profile-settings-panel">
      <div className="lifeos-settings-panel-header">
        <Heading level={2} size="md">
          Profile
        </Heading>
        <Text tone="secondary">Manage your display name and account representation.</Text>
      </div>

      <div className="lifeos-profile-avatar-row">
        <Avatar name={displayName || profile.email} size="lg" />
        <div className="lifeos-profile-avatar-meta">
          <Text weight="semibold">{displayName || "Your Name"}</Text>
          <Text tone="secondary" size="sm">
            {profile.email}
          </Text>
        </div>
      </div>

      {successMessage && (
        <Alert tone="success" heading="Success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="lifeos-settings-form">
        <FormFieldGroup>
          <FormErrorSummary title="Please resolve the following issue:" />

          <div className="lifeos-settings-field">
            <FormField
              name="email"
              label="Email address"
              description="Your account email is verified and permanent."
            >
              {(field) => (
                <TextInput {...field} value={profile.email} readOnly autoComplete="email" />
              )}
            </FormField>
          </div>

          <div className="lifeos-settings-field">
            <FormField
              name="displayName"
              label="Display name"
              required
              description="The name displayed across your workspace and reviews."
              {...(errors.displayName ? { error: errors.displayName } : {})}
            >
              {(field) => (
                <TextInput
                  {...field}
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (errors.displayName) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.displayName;
                        return next;
                      });
                    }
                  }}
                  maxLength={100}
                  autoComplete="name"
                />
              )}
            </FormField>
          </div>

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
