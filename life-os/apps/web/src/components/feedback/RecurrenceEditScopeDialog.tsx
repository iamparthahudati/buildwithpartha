import { useRef, useState, type RefObject } from "react";

import { Button } from "@components/ui";
import type { RecurrenceEditScope } from "@components/forms";

import { Dialog, type DialogProps } from "./Dialog";
import { InlineMessage } from "./InlineMessage";
import "./recurrence-edit-scope-dialog.css";

export interface RecurrenceEditScopeDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (scope: RecurrenceEditScope) => void;
  readonly title?: string;
  readonly description?: string;
  readonly actionType?: "edit" | "delete";
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly pending?: boolean;
  readonly error?: string;
  readonly dismissible?: DialogProps["dismissible"];
  readonly className?: string;
}

interface ScopeOption {
  readonly value: RecurrenceEditScope;
  readonly label: string;
  readonly description: string;
}

const SCOPE_OPTIONS: readonly ScopeOption[] = [
  {
    value: "THIS_OCCURRENCE",
    label: "This occurrence only",
    description: "Applies changes to this single instance. Future occurrences remain unchanged.",
  },
  {
    value: "THIS_AND_FUTURE",
    label: "This and future occurrences",
    description:
      "Applies changes to this occurrence and all upcoming occurrences. Past instances remain untouched.",
  },
  {
    value: "SERIES",
    label: "All occurrences in series",
    description:
      "Applies changes across the entire recurring series definition and all linked occurrences.",
  },
];

export function RecurrenceEditScopeDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  actionType = "edit",
  confirmLabel,
  cancelLabel = "Cancel",
  pending = false,
  error,
  dismissible = true,
  className,
}: RecurrenceEditScopeDialogProps) {
  const [selectedScope, setSelectedScope] = useState<RecurrenceEditScope>("THIS_OCCURRENCE");
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelectedScope("THIS_OCCURRENCE");
    }
  }

  const defaultTitle = actionType === "delete" ? "Delete Recurring Task" : "Edit Recurring Task";
  const defaultDesc =
    actionType === "delete"
      ? "Select which occurrences of this recurring task you want to delete."
      : "Select how your changes should apply to this recurring series.";

  const effectiveConfirmLabel =
    confirmLabel ?? (actionType === "delete" ? "Delete Task" : "Apply Edit");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title ?? defaultTitle}
      description={description ?? defaultDesc}
      size="sm"
      dismissible={dismissible}
      initialFocusRef={cancelRef as RefObject<HTMLElement | null>}
      {...(className === undefined ? {} : { className })}
    >
      <div className="lifeos-recurrence-edit-scope-dialog">
        {error && (
          <InlineMessage tone="danger" announce="alert">
            {error}
          </InlineMessage>
        )}

        <div
          className="lifeos-recurrence-edit-scope-dialog__options"
          role="radiogroup"
          aria-label="Recurrence edit scope options"
        >
          {SCOPE_OPTIONS.map((opt) => {
            const isSelected = selectedScope === opt.value;
            const inputId = `edit-scope-${opt.value.toLowerCase()}`;
            return (
              <label
                key={opt.value}
                htmlFor={inputId}
                className={[
                  "lifeos-recurrence-edit-scope-dialog__option-card",
                  isSelected ? "lifeos-recurrence-edit-scope-dialog__option-card--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="edit-scope"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => setSelectedScope(opt.value)}
                  disabled={pending}
                  className="lifeos-recurrence-edit-scope-dialog__radio"
                />
                <span className="lifeos-recurrence-edit-scope-dialog__option-title">
                  {opt.label}
                </span>
                <span className="lifeos-recurrence-edit-scope-dialog__option-desc">
                  {opt.description}
                </span>
              </label>
            );
          })}
        </div>

        <div className="lifeos-recurrence-edit-scope-dialog__actions">
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={actionType === "delete" ? "danger" : "primary"}
            onClick={() => onConfirm(selectedScope)}
            loading={pending}
          >
            {effectiveConfirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
