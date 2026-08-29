import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";

import { Heading, IconButton, VisuallyHidden } from "@components/ui";
import { useFocusTrap } from "@hooks/useFocusTrap";

import { ConfirmDialog } from "./ConfirmDialog";
import { isTopDialog, openDialogCount, popDialog, pushDialog } from "./dialogStack";
import "./drawer.css";

/**
 * Drawer (LOS-0414).
 *
 * A side panel on a wide viewport, a full-screen sheet on a narrow one — the
 * ticket's "side/full-screen responsive variants" is what that word already
 * means: automatic by breakpoint, not a size a caller picks, the same
 * responsive-by-default treatment `Dialog`'s own mobile sheet already uses.
 *
 * Shares `useFocusTrap` and `dialogStack.ts` with `Dialog` (LOS-0412) rather
 * than reimplementing either — a Drawer is a `Dialog` with different
 * positioning and edge-anchored motion, not a different set of accessibility
 * guarantees. Escape, a backdrop click and nesting all behave identically:
 * a Drawer opened over a Dialog, or another Drawer, only closes the topmost
 * layer. It renders a `<dialog>` element for the same implicit-role reason
 * `Dialog` does, with `aria-modal` asserted by hand for the same reason too
 * — see that component's own note on why `showModal()` is not used.
 *
 * `isDirty` is what the ticket calls the dirty-state guard: while true,
 * Escape, the backdrop and the close button all open a confirmation instead
 * of calling `onClose` directly, so a form's unsaved edits are never lost to
 * a stray Escape press. Detecting dirtiness stays the caller's job — a plain
 * boolean prop — the same "component supplies the mechanism, caller supplies
 * the state" split every controlled composed component in this design
 * system already uses.
 */

export type DrawerPlacement = "start" | "end" | "bottom";

export interface DrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly titleHidden?: boolean;
  /** Complete accessible name for the close control when several layers may be open. */
  readonly closeLabel?: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  /** Same meaning as `Dialog`'s: guards Escape and a backdrop click, never the close button. */
  readonly dismissible?: boolean;
  /** True while the panel holds unsaved changes; guards every dismissal path behind a confirmation. */
  readonly isDirty?: boolean;
  readonly discardTitle?: string;
  readonly discardDescription?: string;
  readonly discardConfirmLabel?: string;
  /** Which edge it slides from. "end" (the default) is the trailing edge — right in LTR. */
  readonly placement?: DrawerPlacement;
  readonly className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  titleHidden = false,
  closeLabel = "Close",
  description,
  children,
  initialFocusRef,
  dismissible = true,
  isDirty = false,
  discardTitle = "Discard unsaved changes?",
  discardDescription = "Your changes will be lost. This can't be undone.",
  discardConfirmLabel = "Discard changes",
  placement = "end",
  className,
}: DrawerProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = description === undefined ? undefined : `${id}-description`;
  const containerRef = useRef<HTMLDialogElement>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  useFocusTrap(containerRef, open, initialFocusRef);

  useEffect(() => {
    if (!open) {
      return;
    }

    pushDialog(id);
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

  function requestClose() {
    if (isDirty) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape" && dismissible && isTopDialog(id)) {
      requestClose();
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && dismissible && isTopDialog(id)) {
      requestClose();
    }
  }

  return (
    <>
      {/*
       * A pointer-only convenience with real keyboard equivalents already in
       * place — Escape and the close button both request the same dismissal
       * — so the backdrop needs no keyboard handler of its own.
       */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="lifeos-drawer-backdrop" onClick={handleBackdropClick}>
        <dialog
          ref={containerRef}
          open
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          aria-modal="true"
          className={["lifeos-drawer", `lifeos-drawer--${placement}`, className]
            .filter(Boolean)
            .join(" ")}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          <div className="lifeos-drawer__header">
            {titleHidden ? (
              <VisuallyHidden as="div">
                <Heading level={2} id={titleId}>
                  {title}
                </Heading>
              </VisuallyHidden>
            ) : (
              <Heading level={2} size="sm" id={titleId} className="lifeos-drawer__title">
                {title}
              </Heading>
            )}

            <IconButton
              icon={X}
              label={closeLabel}
              variant="ghost"
              size="sm"
              className="lifeos-drawer__close"
              onClick={requestClose}
            />
          </div>

          {description ? (
            <p id={descriptionId} className="lifeos-drawer__description">
              {description}
            </p>
          ) : null}

          <div className="lifeos-drawer__body">{children}</div>
        </dialog>
      </div>

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
