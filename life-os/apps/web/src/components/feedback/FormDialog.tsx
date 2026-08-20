import { useState, type ReactNode, type RefObject } from "react";

import { Button } from "@components/ui";

import { ConfirmDialog } from "./ConfirmDialog";
import { Dialog } from "./Dialog";
import { InlineMessage } from "./InlineMessage";
import "./form-dialog.css";

/**
 * FormDialog (LOS-0425).
 *
 * A create/edit form on `Dialog` (LOS-0412). `pending`/`error` are plain
 * controlled props — no internal `try`/`catch`/`await` — the same
 * "component supplies the mechanism, caller supplies the state" split
 * `ConfirmDialog` (LOS-0413) already uses for the identical reason: only the
 * caller's own submit handler knows whether its async work is still in
 * flight, safe to retry, or already committed.
 *
 * Dialog funnels Escape, the backdrop and its own close button into one
 * `onClose` callback, which is what lets the dirty guard intercept all
 * three at a single point (`requestClose`) rather than needing `Drawer`'s
 * (LOS-0414) per-path wiring. "Success close" needs no code of its own:
 * once the caller's `onSubmit` succeeds, it calls the same `onClose` this
 * component was given, and `Dialog`'s own focus trap already restores focus
 * to whatever opened it — the same behavior every dialog in this design
 * system already gets, not something specific to a form succeeding.
 *
 * Below the small breakpoint the dialog becomes a true full-screen sheet —
 * distinct from `Dialog`'s own baseline mobile treatment (a bottom sheet
 * capped at 90dvh, for a short confirmation), because a real form usually
 * needs the whole viewport's height to stay usable once its keyboard is up.
 */

export interface FormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** The form's own submit handler. Called only when not already `pending`. */
  readonly onSubmit: () => void;
  readonly title: string;
  readonly description?: string;
  /** The form's own fields. */
  readonly children: ReactNode;
  /** Repeats the action, e.g. "Create project", never a generic "Save"/"Submit". */
  readonly submitLabel: string;
  readonly cancelLabel?: string;
  /** Guards Escape, the backdrop and Cancel behind a discard confirmation. */
  readonly isDirty?: boolean;
  readonly pending?: boolean;
  readonly pendingLabel?: string;
  /** A server-level problem from the last attempt — not a single field's own error. */
  readonly error?: string;
  readonly discardTitle?: string;
  readonly discardDescription?: string;
  readonly discardConfirmLabel?: string;
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  readonly className?: string;
}

export function FormDialog({
  open,
  onClose,
  onSubmit,
  title,
  description,
  children,
  submitLabel,
  cancelLabel = "Cancel",
  isDirty = false,
  pending = false,
  pendingLabel,
  error,
  discardTitle = "Discard unsaved changes?",
  discardDescription = "Your changes will be lost. This can't be undone.",
  discardConfirmLabel = "Discard changes",
  initialFocusRef,
  className,
}: FormDialogProps) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  function requestClose() {
    if (pending) {
      return;
    }
    if (isDirty) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        title={title}
        {...(description !== undefined ? { description } : {})}
        {...(initialFocusRef !== undefined ? { initialFocusRef } : {})}
        className={["lifeos-form-dialog", className].filter(Boolean).join(" ")}
      >
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!pending) {
              onSubmit();
            }
          }}
        >
          <div className="lifeos-form-dialog__fields">{children}</div>

          {error ? (
            <InlineMessage tone="danger" announce="alert" className="lifeos-form-dialog__error">
              {error}
            </InlineMessage>
          ) : null}

          <div className="lifeos-form-dialog__actions">
            <Button type="button" variant="secondary" onClick={requestClose} disabled={pending}>
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              loading={pending}
              {...(pendingLabel !== undefined ? { loadingLabel: pendingLabel } : {})}
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmingDiscard}
        onClose={() => setConfirmingDiscard(false)}
        onConfirm={() => {
          setConfirmingDiscard(false);
          onClose();
        }}
        title={discardTitle}
        description={discardDescription}
        confirmLabel={discardConfirmLabel}
      />
    </>
  );
}
