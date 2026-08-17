import { useRef, useState, type RefObject } from "react";

import { Button, TextInput } from "@components/ui";

import { Dialog, type DialogProps } from "./Dialog";
import { InlineMessage } from "./InlineMessage";
import "./confirm-dialog.css";

/**
 * ConfirmDialog (LOS-0413).
 *
 * For an irreversible or high-impact action only — the tone guide is explicit
 * that a reversible one prefers an `Undo` (a `Toast` action slot, say) over a
 * confirmation, and that `Undo` never substitutes for confirming one that
 * genuinely can't be taken back. `description` is required, never optional:
 * "the dialog must name the record and exact consequence" is not a nicety
 * here, it is the entire reason this component exists rather than a plain
 * `Dialog` with two buttons. `confirmLabel` is required for the same reason
 * — "Generic Are you sure?, Yes, Proceed... are prohibited," and a button
 * that only ever said "Confirm" would be exactly that prohibition with extra
 * steps.
 *
 * State stays the caller's, the same "controlled, nothing invented
 * internally" shape every composed field in this design system already
 * uses: `pending`/`error` are plain props, not something this component
 * awaits or catches itself. `onConfirm` cannot tell this component whether
 * its own async work is safe to retry, still in flight, or already
 * committed, and guessing wrong in either direction — closing before a
 * write actually landed, or silently swallowing a rejection — is worse
 * than asking the caller to say so explicitly.
 */

export interface ConfirmDialogProps {
  readonly open: boolean;
  /** Cancel, Escape and (when `dismissible`) the backdrop all call this. */
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  /** Names the record and the action, e.g. `Archive "Website refresh"?`. */
  readonly title: string;
  /** The exact consequence. Never optional — see the component note above. */
  readonly description: string;
  /** Repeats the action, e.g. "Archive project", never a generic "Yes"/"Confirm". */
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  /** Disables both buttons and shows the confirm button as busy. */
  readonly pending?: boolean;
  readonly pendingLabel?: string;
  /** A problem from the last attempt, shown without losing the user's place. */
  readonly error?: string;
  /**
   * The exact text the user must type before `confirmLabel` becomes
   * enabled — the ticket's "optional typed confirmation only for high-impact
   * operations" escalation, e.g. the record's own name or a fixed word. Omit
   * for the ordinary case; the tone guide reserves this for account deletion
   * and anything the security contract names specifically, not every delete.
   */
  readonly typedConfirmation?: string;
  readonly typedConfirmationLabel?: string;
  /**
   * Escape and a backdrop click are both equivalent to Cancel here — neither
   * one performs the action — so they default on. Set `false` only for the
   * most severe operations, where even a stray dismissal should require a
   * deliberate click.
   */
  readonly dismissible?: DialogProps["dismissible"];
  readonly className?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  pending = false,
  pendingLabel,
  error,
  typedConfirmation,
  typedConfirmationLabel,
  dismissible = true,
  className,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const typedInputRef = useRef<HTMLInputElement>(null);

  // A confirmation typed for a previous open must not silently carry over —
  // reopening the same dialog for a new attempt starts the requirement over.
  // Adjusted during render rather than in an effect, React's own documented
  // way to reset state in response to a prop change without an extra render
  // the user could see flash the stale value first.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTypedValue("");
    }
  }

  const typedConfirmationSatisfied =
    typedConfirmation === undefined || typedValue === typedConfirmation;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissible={dismissible}
      // The text field needs focus first when one is present, since nothing
      // else can be done until it is filled in; otherwise Cancel — the safe
      // option — so an accidental Enter press cannot land on the danger
      // action by default.
      initialFocusRef={
        (typedConfirmation === undefined
          ? cancelRef
          : typedInputRef) as RefObject<HTMLElement | null>
      }
      {...(className === undefined ? {} : { className })}
    >
      <div className="lifeos-confirm-dialog">
        {typedConfirmation === undefined ? null : (
          <TextInput
            ref={typedInputRef}
            label={typedConfirmationLabel ?? `Type "${typedConfirmation}" to confirm`}
            value={typedValue}
            onChange={(event) => setTypedValue(event.target.value)}
            disabled={pending}
            autoComplete="off"
          />
        )}

        {error ? (
          <InlineMessage tone="danger" announce="alert">
            {error}
          </InlineMessage>
        ) : null}

        <div className="lifeos-confirm-dialog__actions">
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={!typedConfirmationSatisfied}
            loading={pending}
            {...(pendingLabel === undefined ? {} : { loadingLabel: pendingLabel })}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
