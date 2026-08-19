import { useState, type FormEvent } from "react";

import { Alert, ConfirmDialog } from "@components/feedback";
import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Badge, Button, Divider, Heading, PasswordInput, Skeleton, Text } from "@components/ui";
import {
  resolveChangePasswordFieldErrors,
  useChangePassword,
  useRevokeAllOtherSessions,
  useRevokeSession,
  useUserSessions,
  validateChangePasswordForm,
  type ChangePasswordErrors,
  type SessionInfo,
} from "@features/auth";

export function SecuritySettingsPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formErrors, setFormErrors] = useState<ChangePasswordErrors>({});
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);

  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [confirmRevokeOtherOpen, setConfirmRevokeOtherOpen] = useState(false);

  const changePasswordMutation = useChangePassword();
  const sessionsQuery = useUserSessions();
  const revokeSessionMutation = useRevokeSession();
  const revokeOtherSessionsMutation = useRevokeAllOtherSessions();

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordSuccessMessage(null);

    const validationErrors = validateChangePasswordForm({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    changePasswordMutation.mutate(
      {
        currentPassword,
        newPassword,
      },
      {
        onSuccess: () => {
          setPasswordSuccessMessage(
            "Password changed successfully. All other sessions have been signed out.",
          );
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          void sessionsQuery.refetch();
        },
        onError: (error) => {
          const resolved = resolveChangePasswordFieldErrors(error);
          if (Object.keys(resolved).length > 0) {
            setFormErrors(resolved);
          } else {
            setFormErrors({
              currentPassword:
                error.message || "Failed to change password. Please check your credentials.",
            });
          }
        },
      },
    );
  };

  const handleConfirmRevokeSession = () => {
    if (!revokingSessionId) return;
    const targetId = revokingSessionId;
    setRevokingSessionId(null);
    revokeSessionMutation.mutate(targetId);
  };

  const handleConfirmRevokeAllOther = () => {
    setConfirmRevokeOtherOpen(false);
    revokeOtherSessionsMutation.mutate();
  };

  const isPasswordDirty = Boolean(currentPassword || newPassword || confirmPassword);
  const sessions = sessionsQuery.data?.sessions ?? [];
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="lifeos-settings-panel" data-testid="security-settings-panel">
      <div className="lifeos-settings-panel-header">
        <Heading level={2} size="md">
          Security
        </Heading>
        <Text tone="secondary">
          Manage your password, active sessions, and account credentials.
        </Text>
      </div>

      {/* Change Password Section */}
      <div className="lifeos-settings-section">
        <Heading level={3} size="sm">
          Change password
        </Heading>
        <Text tone="secondary" size="sm">
          Choose a strong password with at least 8 characters. Changing your password will sign out
          all other devices.
        </Text>

        {passwordSuccessMessage && (
          <Alert
            tone="success"
            heading="Password updated"
            onDismiss={() => setPasswordSuccessMessage(null)}
          >
            {passwordSuccessMessage}
          </Alert>
        )}

        <form onSubmit={handlePasswordSubmit} noValidate className="lifeos-settings-form">
          <FormFieldGroup>
            <FormErrorSummary title="Please resolve the following issue:" />

            <div className="lifeos-settings-field">
              <FormField
                name="currentPassword"
                label="Current password"
                required
                {...(formErrors.currentPassword ? { error: formErrors.currentPassword } : {})}
              >
                {(field) => (
                  <PasswordInput
                    {...field}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (formErrors.currentPassword) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.currentPassword;
                          return next;
                        });
                      }
                    }}
                    autoComplete="current-password"
                  />
                )}
              </FormField>
            </div>

            <div className="lifeos-settings-field">
              <FormField
                name="newPassword"
                label="New password"
                required
                description="Must be at least 8 characters and not commonly exposed in breaches."
                {...(formErrors.newPassword ? { error: formErrors.newPassword } : {})}
              >
                {(field) => (
                  <PasswordInput
                    {...field}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (formErrors.newPassword) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.newPassword;
                          return next;
                        });
                      }
                    }}
                    autoComplete="new-password"
                  />
                )}
              </FormField>
            </div>

            <div className="lifeos-settings-field">
              <FormField
                name="confirmPassword"
                label="Confirm new password"
                required
                {...(formErrors.confirmPassword ? { error: formErrors.confirmPassword } : {})}
              >
                {(field) => (
                  <PasswordInput
                    {...field}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (formErrors.confirmPassword) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.confirmPassword;
                          return next;
                        });
                      }
                    }}
                    autoComplete="new-password"
                  />
                )}
              </FormField>
            </div>

            <div className="lifeos-settings-actions">
              <Button
                type="submit"
                variant="primary"
                loading={changePasswordMutation.isPending}
                disabled={!isPasswordDirty || changePasswordMutation.isPending}
              >
                Change password
              </Button>
            </div>
          </FormFieldGroup>
        </form>
      </div>

      <Divider />

      {/* Active Sessions Section */}
      <div className="lifeos-settings-section">
        <div className="lifeos-sessions-header">
          <div>
            <Heading level={3} size="sm">
              Active sessions
            </Heading>
            <Text tone="secondary" size="sm">
              Devices and browsers that are currently logged in to your account.
            </Text>
          </div>

          {otherSessionsCount > 0 && (
            <Button
              variant="danger"
              size="sm"
              loading={revokeOtherSessionsMutation.isPending}
              onClick={() => setConfirmRevokeOtherOpen(true)}
            >
              Sign out all other devices
            </Button>
          )}
        </div>

        {sessionsQuery.isLoading ? (
          <div className="lifeos-sessions-loading">
            <Skeleton height="64px" />
            <Skeleton height="64px" />
          </div>
        ) : sessionsQuery.isError ? (
          <Alert tone="danger" heading="Failed to load sessions">
            {sessionsQuery.error.message || "Could not retrieve active sessions."}
          </Alert>
        ) : sessions.length === 0 ? (
          <Text tone="secondary" size="sm">
            No active sessions found.
          </Text>
        ) : (
          <div className="lifeos-sessions-list" data-testid="sessions-list">
            {sessions.map((session: SessionInfo) => (
              <div
                key={session.id}
                className="lifeos-session-card"
                data-testid={`session-item-${session.id}`}
              >
                <div className="lifeos-session-info">
                  <div className="lifeos-session-title-row">
                    <Text weight="semibold">
                      {session.deviceHint || "Unknown Browser / Device"}
                    </Text>
                    {session.isCurrent && <Badge tone="success">This device</Badge>}
                  </div>
                  <Text tone="secondary" size="xs">
                    Last active: {formatDate(session.lastSeenAt)} • Signed in:{" "}
                    {formatDate(session.createdAt)}
                  </Text>
                </div>

                {!session.isCurrent && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={
                      revokeSessionMutation.isPending &&
                      revokeSessionMutation.variables === session.id
                    }
                    onClick={() => setRevokingSessionId(session.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Revoke Single Session Dialog */}
      <ConfirmDialog
        open={Boolean(revokingSessionId)}
        title="Revoke session?"
        description="This will sign out the selected device immediately. Any unsaved changes on that device may be lost."
        confirmLabel="Revoke session"
        onConfirm={handleConfirmRevokeSession}
        onClose={() => setRevokingSessionId(null)}
      />

      {/* Confirm Revoke All Other Sessions Dialog */}
      <ConfirmDialog
        open={confirmRevokeOtherOpen}
        title="Sign out all other devices?"
        description="Every active session except your current browser session will be revoked immediately."
        confirmLabel="Sign out all other devices"
        onConfirm={handleConfirmRevokeAllOther}
        onClose={() => setConfirmRevokeOtherOpen(false)}
      />
    </div>
  );
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
