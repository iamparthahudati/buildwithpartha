import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";

import { Heading, IconButton, VisuallyHidden } from "@components/ui";
import { useFocusTrap } from "@hooks/useFocusTrap";

import { isTopDialog, openDialogCount, popDialog, pushDialog } from "./dialogStack";
import "./dialog.css";

/**
 * Dialog (LOS-0412).
 *
 * A `<dialog>` element rendered and controlled entirely by React rather than
 * through `showModal()`/`close()`: jsdom, this project's test environment,
 * implements neither method at all, which would make every behavior here
 * untestable rather than merely harder to test. `<dialog>` is kept as the
 * element for its implicit `dialog` role and forward compatibility; the
 * modal behavior itself — focus trap, Escape, backdrop dismissal, body
 * scroll lock, nested-dialog Escape routing — is built explicitly, which
 * also means every one of those behaviors has a real, passing test rather
 * than a plausible-sounding claim about what the platform does.
 *
 * `dialogStack.ts` is what makes Escape safe to nest: pressing it while a
 * confirmation dialog is open above another dialog must close only the
 * confirmation, never both at once, which a bare per-instance keydown
 * listener cannot tell apart on its own.
 */

export type DialogSize = "sm" | "md" | "lg";

export interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  /** Hides the title visually while keeping it as the dialog's accessible name. */
  readonly titleHidden?: boolean;
  readonly description?: string;
  readonly children: ReactNode;
  /** Focused on open instead of the first focusable descendant. */
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Disables Escape and backdrop-click dismissal. For a destructive
   * confirmation that must be answered through its own buttons — `false`
   * here does not remove any explicit close control the dialog's own content
   * provides, only the two implicit ways to dismiss it by accident.
   */
  readonly dismissible?: boolean;
  readonly size?: DialogSize;
  readonly className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  titleHidden = false,
  description,
  children,
  initialFocusRef,
  dismissible = true,
  size = "md",
  className,
}: DialogProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = description === undefined ? undefined : `${id}-description`;
  const containerRef = useRef<HTMLDialogElement>(null);

  useFocusTrap(containerRef, open, initialFocusRef);

  useEffect(() => {
    if (!open) {
      return;
    }

    pushDialog(id);
    // Locks the page behind the dialog only while this is the sole open
    // one; a second, nested dialog must not re-lock (harmless) or, on its
    // own close, unlock a page that the outer dialog is still covering.
    const wasOnlyDialog = openDialogCount() === 1;
    const previousOverflow = document.body.style.overflow;
    if (wasOnlyDialog) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      popDialog(id);
      if (wasOnlyDialog) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [open, id]);

  if (!open) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape" && dismissible && isTopDialog(id)) {
      // Not stopped from propagating: a dialog opened from inside a Drawer
      // or another layer may still need its own Escape handler to see this.
      onClose();
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && dismissible && isTopDialog(id)) {
      onClose();
    }
  }

  return (
    /*
     * A pointer-only convenience with real keyboard equivalents already in
     * place — Escape and the close button both dismiss the same dialog — so
     * the backdrop itself needs no keyboard handler of its own; it is not an
     * interactive element with something a keyboard user would otherwise be
     * unable to do.
     */
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="lifeos-dialog-backdrop" onClick={handleBackdropClick}>
      <dialog
        ref={containerRef}
        open
        className={["lifeos-dialog", `lifeos-dialog--${size}`, className].filter(Boolean).join(" ")}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        // `<dialog>` only gets an implicit `aria-modal="true"` when opened
        // through `showModal()`. Modal-ness here is built by hand — the
        // backdrop, the focus trap, the scroll lock — so it is asserted by
        // hand too, or assistive technology would have no way to know this
        // one is meant to block the rest of the page.
        aria-modal="true"
        onKeyDown={handleKeyDown}
        // The trap already gives it a tab stop when nothing else can take
        // focus first; needed as a target for that fallback.
        tabIndex={-1}
      >
        <div className="lifeos-dialog__header">
          {titleHidden ? (
            <VisuallyHidden as="div">
              <Heading level={2} id={titleId}>
                {title}
              </Heading>
            </VisuallyHidden>
          ) : (
            <Heading level={2} size="sm" id={titleId} className="lifeos-dialog__title">
              {title}
            </Heading>
          )}

          {/*
            Independent of `dismissible`: that prop only guards the two
            *accidental* ways to lose a dialog's content — Escape and a
            stray backdrop click — never the deliberate one. A destructive
            confirmation still needs a clearly-labelled way out.
          */}
          <IconButton
            icon={X}
            label="Close"
            variant="ghost"
            size="sm"
            className="lifeos-dialog__close"
            onClick={onClose}
          />
        </div>

        {description ? (
          <p id={descriptionId} className="lifeos-dialog__description">
            {description}
          </p>
        ) : null}

        <div className="lifeos-dialog__body">{children}</div>
      </dialog>
    </div>
  );
}
