import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { InlineMessage } from "@components/feedback";
import { Badge, Button, CountBadge, Link, Surface, Text, Textarea } from "@components/ui";

import "./today-brain-capture.css";

export type TodayBrainDumpCountStatus =
  | { readonly type: "loading" }
  | { readonly type: "ready"; readonly unprocessedCount: number }
  | { readonly type: "error"; readonly message: string };

export type TodayBrainCaptureStatus =
  | { readonly type: "idle" }
  | { readonly type: "saving" }
  | { readonly type: "saved"; readonly message?: string }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "offline-draft"; readonly message?: string };

export type TodayBrainCaptureMode = "create" | "device-draft";

export interface TodayBrainCaptureRequest {
  readonly content: string;
  readonly mode: TodayBrainCaptureMode;
}

export interface TodayBrainCaptureProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** The caller persists online creates or user/session-scoped device drafts. */
  readonly onCapture: (request: TodayBrainCaptureRequest) => void;
  readonly countStatus: TodayBrainDumpCountStatus;
  readonly captureStatus: TodayBrainCaptureStatus;
  readonly isOnline: boolean;
  /** True only when the caller actually persists an account/session-scoped device draft. */
  readonly offlineDraftSupported?: boolean;
  readonly brainDumpHref: string;
  readonly onRetryCount?: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

function CaptureFeedback({ status }: { readonly status: TodayBrainCaptureStatus }) {
  if (status.type === "saved") {
    return (
      <InlineMessage tone="success" announce="status">
        {status.message ?? "Brain Dump Item added."}
      </InlineMessage>
    );
  }

  if (status.type === "error") {
    return (
      <InlineMessage tone="danger" announce="alert">
        {status.message}
      </InlineMessage>
    );
  }

  if (status.type === "offline-draft") {
    return (
      <InlineMessage tone="info" announce="status">
        {status.message ?? "Saved on this device. Sync is not confirmed yet."}
      </InlineMessage>
    );
  }

  return null;
}

/**
 * Compact Brain Dump capture for Today (LOS-0613).
 *
 * Text is controlled by the caller so request failures cannot erase it. This
 * component never writes private content to browser storage itself; offline
 * persistence is an explicit `device-draft` request for the integration layer,
 * which must apply the privacy contract's user/session scoping and retention.
 */
export function TodayBrainCapture({
  value,
  onValueChange,
  onCapture,
  countStatus,
  captureStatus,
  isOnline,
  offlineDraftSupported = true,
  brainDumpHref,
  onRetryCount,
  disabled = false,
  className,
}: TodayBrainCaptureProps) {
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const isSaving = captureStatus.type === "saving";
  const captureUnavailableOffline = !isOnline && !offlineDraftSupported;
  const rootClassName = ["lifeos-today-brain-capture", className].filter(Boolean).join(" ");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = value.trim();

    if (!content) {
      setValidationError("Write something to capture.");
      return;
    }

    setValidationError(undefined);
    if (!captureUnavailableOffline) {
      onCapture({ content, mode: isOnline ? "create" : "device-draft" });
    }
  };

  const countAction =
    countStatus.type === "ready" ? (
      <CountBadge count={countStatus.unprocessedCount} label="unprocessed Brain Dump Items" />
    ) : countStatus.type === "loading" ? (
      <Badge>Loading count</Badge>
    ) : (
      <Badge>Count unavailable</Badge>
    );

  return (
    <Surface
      as="section"
      title="Brain Dump"
      titleLevel={2}
      titleAction={countAction}
      className={rootClassName}
    >
      <form className="lifeos-today-brain-capture__form" noValidate onSubmit={handleSubmit}>
        <Textarea
          label="What is on your mind?"
          description="Capture it now and decide what it becomes later."
          {...(validationError ? { error: validationError } : {})}
          value={value}
          rows={3}
          autoGrow
          disabled={disabled || isSaving || captureUnavailableOffline}
          onChange={(event) => {
            onValueChange(event.target.value);
            if (validationError) setValidationError(undefined);
          }}
        />

        {!isOnline && captureStatus.type !== "offline-draft" ? (
          <InlineMessage tone="warning">
            {offlineDraftSupported
              ? "Offline. Save a device draft to keep this text on this device."
              : "Offline. Keep this page open and reconnect to add this Brain Dump Item."}
          </InlineMessage>
        ) : null}

        <CaptureFeedback status={captureStatus} />

        {countStatus.type === "error" ? (
          <div className="lifeos-today-brain-capture__count-error">
            <Text tone="muted" size="xs">
              {countStatus.message}
            </Text>
            {onRetryCount ? (
              <Button variant="link" size="sm" onClick={onRetryCount}>
                Retry count
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="lifeos-today-brain-capture__actions">
          <Button
            type="submit"
            size="sm"
            iconStart={Plus}
            loading={isSaving}
            loadingLabel={isOnline ? "Adding Brain Dump Item" : "Saving device draft"}
            disabled={disabled || captureUnavailableOffline}
          >
            {isOnline
              ? "Capture"
              : offlineDraftSupported
                ? "Save device draft"
                : "Capture unavailable offline"}
          </Button>
          <Link href={brainDumpHref} quiet>
            Open Brain Dump
          </Link>
        </div>
      </form>
    </Surface>
  );
}
