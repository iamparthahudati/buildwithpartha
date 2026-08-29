import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { Plus, Wifi, WifiOff } from "lucide-react";
import { Button, Textarea } from "@components/ui";
import { InlineMessage } from "@components/feedback";
import "./brain-dump-capture-bar.css";

export type BrainDumpCaptureStatus =
  | { readonly type: "idle" }
  | { readonly type: "saving" }
  | { readonly type: "saved"; readonly message?: string }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "offline-queued" };

export interface BrainDumpCaptureBarProps {
  readonly isOnline: boolean;
  readonly captureStatus: BrainDumpCaptureStatus;
  readonly onCapture: (content: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

/**
 * Compact capture bar for the Brain Dump inbox (LOS-1205).
 *
 * Content is local state so users can recover text on API failure. The caller
 * owns the async operation; this component only validates and signals.
 * Keyboard shortcut: Ctrl/Cmd+Enter submits.
 */
export function BrainDumpCaptureBar({
  isOnline,
  captureStatus,
  onCapture,
  disabled = false,
  className,
}: BrainDumpCaptureBarProps) {
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSaving = captureStatus.type === "saving";
  const isDisabled = disabled || isSaving;
  const rootClass = ["lifeos-brain-dump-capture-bar", className].filter(Boolean).join(" ");

  const doCapture = () => {
    const content = value.trim();
    if (!content) {
      setValidationError("Write something to capture.");
      textareaRef.current?.focus();
      return;
    }
    setValidationError(undefined);
    onCapture(content);
    // Clear on success-like statuses; keep on error so user can retry
    if (captureStatus.type !== "error") {
      setValue("");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    doCapture();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      doCapture();
    }
  };

  // Clear text after a successful save that has been acknowledged
  if (captureStatus.type === "saved" && value !== "") {
    setValue("");
  }

  return (
    <form
      className={rootClass}
      aria-label="Capture Brain Dump item"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="lifeos-brain-dump-capture-bar__field">
        <Textarea
          ref={textareaRef}
          label="What is on your mind?"
          description={
            isOnline
              ? "Press Ctrl+Enter to capture quickly."
              : "Offline — items will be queued and sent when you reconnect."
          }
          {...(validationError ? { error: validationError } : {})}
          value={value}
          rows={2}
          autoGrow
          disabled={isDisabled}
          onChange={(event) => {
            setValue(event.target.value);
            if (validationError) setValidationError(undefined);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {!isOnline && (
        <InlineMessage tone="warning">
          <WifiOff size={14} aria-hidden="true" />
          Offline — this item will be queued. Keep this page open until you reconnect.
        </InlineMessage>
      )}

      {captureStatus.type === "error" && (
        <InlineMessage tone="danger" announce="alert">
          {captureStatus.message}
        </InlineMessage>
      )}

      {captureStatus.type === "saved" && (
        <InlineMessage tone="success" announce="status">
          {captureStatus.message ?? "Brain Dump item captured."}
        </InlineMessage>
      )}

      {captureStatus.type === "offline-queued" && (
        <InlineMessage tone="info" announce="status">
          Queued. Will sync when you reconnect.
        </InlineMessage>
      )}

      <div className="lifeos-brain-dump-capture-bar__footer">
        <Button
          type="submit"
          size="sm"
          variant="primary"
          iconStart={Plus}
          loading={isSaving}
          loadingLabel={isOnline ? "Capturing Brain Dump item" : "Queuing Brain Dump item"}
          disabled={isDisabled}
        >
          {isOnline ? "Capture" : "Queue item"}
        </Button>

        {isOnline ? (
          <span className="lifeos-brain-dump-capture-bar__status-icon" aria-hidden="true">
            <Wifi size={14} />
          </span>
        ) : (
          <span className="lifeos-brain-dump-capture-bar__status-icon" aria-hidden="true">
            <WifiOff size={14} />
          </span>
        )}
      </div>
    </form>
  );
}
