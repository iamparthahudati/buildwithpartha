import { useState, type FormEvent } from "react";

import { Alert, Dialog } from "@components/feedback";
import { FormField, FormFieldGroup } from "@components/forms";
import {
  Badge,
  Button,
  Divider,
  Heading,
  PasswordInput,
  Skeleton,
  Surface,
  Text,
  TextInput,
} from "@components/ui";
import type { UserProfileResponse } from "@features/user";

import { useAccountDeletion } from "../hooks/useAccountDeletion";
import { useDataExports, useRequestDataExport } from "../hooks/useDataExport";
import type { ExportItem } from "../model/privacy";

export interface PrivacySettingsPanelProps {
  readonly profile: UserProfileResponse;
  readonly onAccountDeleted?: () => void;
}

export function PrivacySettingsPanel({ profile, onAccountDeleted }: PrivacySettingsPanelProps) {
  const {
    data: exportData,
    isLoading: isExportLoading,
    error: exportQueryError,
  } = useDataExports();

  const requestExportMutation = useRequestDataExport();
  const deleteAccountMutation = useAccountDeletion();

  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [localDeleteError, setLocalDeleteError] = useState<string | null>(null);
  const [scheduledPurgeAt, setScheduledPurgeAt] = useState<string | null>(null);

  const exports = exportData?.exports ?? [];

  const handleRequestExport = () => {
    setRequestSuccessMessage(null);
    // `mutateAsync().then()` rather than `.mutate(vars, { onSuccess })`:
    // verified live against a real backend, the call-time callback form is
    // unreliable. See VerifyEmailScreen/LoginScreen.
    requestExportMutation
      .mutateAsync(undefined)
      .then(() => {
        setRequestSuccessMessage(
          "Your data export archive is being prepared in the background. It will appear below when ready.",
        );
      })
      .catch(() => {
        // No local error handling here — `requestExportMutation.error` is
        // read directly in render below for that.
      });
  };

  const handleDeleteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalDeleteError(null);

    const expectedName = profile.displayName.trim();
    if (
      deleteConfirmationText.trim().toLowerCase() !== expectedName.toLowerCase() &&
      deleteConfirmationText.trim().toLowerCase() !== profile.email.toLowerCase()
    ) {
      setLocalDeleteError(`Please enter "${expectedName}" to confirm deletion.`);
      return;
    }

    if (!deletePassword) {
      setLocalDeleteError("Please enter your current account password.");
      return;
    }

    // `mutateAsync().then()/.catch()` rather than `.mutate(vars, { onSuccess,
    // onError })`: verified live against a real backend, the call-time
    // callback form is unreliable. See VerifyEmailScreen/LoginScreen.
    deleteAccountMutation
      .mutateAsync({
        currentPassword: deletePassword,
        confirmationText: deleteConfirmationText,
      })
      .then((response) => {
        setScheduledPurgeAt(response.scheduledPurgeAt);
      })
      .catch((err: Error) => {
        setLocalDeleteError(err.message || "Failed to delete account. Please verify credentials.");
      });
  };

  const handleReturnToSignIn = () => {
    if (onAccountDeleted) {
      onAccountDeleted();
    } else {
      window.location.href = "/life-os/login";
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null || bytes === undefined) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadgeTone = (status: ExportItem["status"]): "success" | "warning" | "neutral" => {
    switch (status) {
      case "READY":
        return "success";
      case "GENERATING":
        return "warning";
      default:
        return "neutral";
    }
  };

  return (
    <div className="lifeos-settings-panel" data-testid="privacy-settings-panel">
      {/* 1. Data Export Section */}
      <section className="lifeos-settings-section">
        <div className="lifeos-settings-section-header">
          <Heading level={2} size="md">
            Data export
          </Heading>
          <Text tone="secondary">
            Download a complete machine-readable archive (.zip) of your personal account data,
            preferences, and history in portable JSON format.
          </Text>
        </div>

        {requestSuccessMessage && (
          <Alert
            tone="success"
            heading="Export requested"
            onDismiss={() => setRequestSuccessMessage(null)}
          >
            {requestSuccessMessage}
          </Alert>
        )}

        {requestExportMutation.error && (
          <Alert tone="danger" heading="Export request failed">
            {requestExportMutation.error.message || "Failed to request data export."}
          </Alert>
        )}

        {exportQueryError && (
          <Alert tone="warning" heading="Could not load export history">
            {exportQueryError.message || "Failed to load data export history."}
          </Alert>
        )}

        <div className="lifeos-settings-actions">
          <Button
            variant="secondary"
            loading={requestExportMutation.isPending}
            onClick={handleRequestExport}
            data-testid="request-export-button"
          >
            Request new export archive
          </Button>
        </div>

        <div className="lifeos-settings-history" data-testid="export-history-list">
          <Heading level={3} size="xs" tone="secondary">
            Recent export requests
          </Heading>

          {isExportLoading ? (
            <div className="lifeos-settings-skeleton">
              <Skeleton shape="block" height="80px" />
            </div>
          ) : exports.length === 0 ? (
            <Surface tone="muted" padding="sm" className="lifeos-settings-empty">
              <Text tone="secondary">No previous export requests.</Text>
            </Surface>
          ) : (
            <div className="lifeos-export-list">
              {exports.map((item) => (
                <Surface
                  key={item.id}
                  tone="default"
                  padding="sm"
                  className="lifeos-export-item"
                  data-testid={`export-item-${item.id}`}
                >
                  <div className="lifeos-export-meta">
                    <Text weight="medium">{item.fileName}</Text>
                    <Text size="xs" tone="secondary">
                      Requested {new Date(item.createdAt).toLocaleString()}
                      {item.fileSizeBytes !== null && ` • ${formatFileSize(item.fileSizeBytes)}`}
                    </Text>
                  </div>

                  <div className="lifeos-export-status">
                    <Badge tone={getStatusBadgeTone(item.status)}>{item.status}</Badge>

                    {item.status === "READY" && (
                      <a
                        href="/auth/export/download"
                        className="lifeos-download-link"
                        data-testid={`download-export-${item.id}`}
                      >
                        <Button variant="ghost" size="sm">
                          Download
                        </Button>
                      </a>
                    )}
                  </div>
                </Surface>
              ))}
            </div>
          )}
        </div>
      </section>

      <Divider />

      {/* 2. Privacy Policy & Posture Notice */}
      <section className="lifeos-settings-section">
        <div className="lifeos-settings-section-header">
          <Heading level={2} size="md">
            Privacy & data posture
          </Heading>
          <Text tone="secondary">
            LifeOS is an adult-first, privacy-respecting system. We never sell your personal data,
            display ads, or export confidential authentication secrets or passwords.
          </Text>
        </div>
      </section>

      <Divider />

      {/* 3. Danger Zone: Account Deletion */}
      <section className="lifeos-settings-section lifeos-settings-danger-zone">
        <div className="lifeos-settings-section-header">
          <Heading level={2} size="md" tone="danger">
            Delete account
          </Heading>
          <Text tone="secondary">
            Delete your LifeOS account and all associated personal records. Sessions on all your
            devices are revoked immediately, and your data is permanently purged after a 30-day
            grace period. You can cancel any time before then using the link we email you.
          </Text>
        </div>

        <div className="lifeos-settings-actions">
          <Button
            variant="danger"
            onClick={() => {
              setDeleteDialogOpen(true);
              setLocalDeleteError(null);
            }}
            data-testid="open-delete-account-button"
          >
            Delete account permanently
          </Button>
        </div>
      </section>

      {/* Account Deletion Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!deleteAccountMutation.isPending) {
            setDeleteDialogOpen(false);
            setDeletePassword("");
            setDeleteConfirmationText("");
            setLocalDeleteError(null);
            setScheduledPurgeAt(null);
          }
        }}
        title={scheduledPurgeAt ? "Deletion scheduled" : "Delete account?"}
        {...(scheduledPurgeAt
          ? {}
          : {
              description: `Your account enters a 30-day cancellable grace period; it is not deleted immediately. To proceed, please enter your display name ("${profile.displayName}") and current password.`,
            })}
        size="sm"
      >
        {scheduledPurgeAt ? (
          <div className="lifeos-delete-scheduled" data-testid="delete-scheduled-confirmation">
            <Text>
              Your account will be permanently deleted on{" "}
              <strong>{new Date(scheduledPurgeAt).toLocaleString()}</strong>. All sessions have been
              revoked. If this wasn&rsquo;t you, or you change your mind, use the cancellation link
              we&rsquo;ve emailed you before then.
            </Text>

            <div className="lifeos-settings-actions">
              <Button
                variant="primary"
                onClick={handleReturnToSignIn}
                data-testid="delete-scheduled-continue"
              >
                Continue to sign in
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleDeleteSubmit}
            className="lifeos-delete-form"
            data-testid="delete-account-form"
          >
            {localDeleteError && (
              <Alert tone="danger" heading="Account deletion error">
                {localDeleteError}
              </Alert>
            )}

            <FormFieldGroup>
              <FormField
                name="confirmationText"
                label={`Type your display name ("${profile.displayName}") to confirm`}
                required
              >
                {(field) => (
                  <TextInput
                    {...field}
                    value={deleteConfirmationText}
                    onChange={(e) => {
                      setDeleteConfirmationText(e.target.value);
                      setLocalDeleteError(null);
                    }}
                    placeholder={profile.displayName}
                    autoComplete="off"
                    data-testid="delete-confirmation-input"
                  />
                )}
              </FormField>

              <FormField name="currentPassword" label="Current account password" required>
                {(field) => (
                  <PasswordInput
                    {...field}
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setLocalDeleteError(null);
                    }}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    data-testid="delete-password-input"
                  />
                )}
              </FormField>
            </FormFieldGroup>

            <div className="lifeos-settings-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={deleteAccountMutation.isPending}
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeletePassword("");
                  setDeleteConfirmationText("");
                  setLocalDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                loading={deleteAccountMutation.isPending}
                disabled={
                  deleteAccountMutation.isPending ||
                  deleteConfirmationText.trim().toLowerCase() !==
                    profile.displayName.trim().toLowerCase() ||
                  !deletePassword
                }
              >
                Yes, schedule deletion
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
