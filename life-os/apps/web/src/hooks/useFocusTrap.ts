import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps keyboard focus inside a container while it is active, and returns it
 * to wherever it came from once it is not (LOS-0412).
 *
 * Built for `Dialog`, but not dialog-specific — a Drawer, a Menu or a
 * Command Palette opening over the rest of the page needs the identical
 * guarantee: Tab and Shift+Tab must never reach content behind an open
 * layer, because a sighted mouse user already can't reach it either, and a
 * keyboard user landing there would be lost in a page they can't see.
 *
 * Three responsibilities, all tied to the same `active` boolean:
 * 1. On activation, move focus in — to `initialFocusRef` if the caller named
 *    one, otherwise the container's first focusable descendant, otherwise
 *    the container itself (given a `tabIndex={-1}` for exactly this,
 *    mirroring the skip-link landmark pattern already used for `App`'s main
 *    content region).
 * 2. While active, wrap Tab at the last focusable descendant back to the
 *    first, and Shift+Tab at the first back to the last.
 * 3. On deactivation, return focus to whatever had it beforehand — the
 *    control that opened the dialog, so a keyboard user's place in the page
 *    is exactly where they left it. This only has anything to restore when
 *    something was actually focused before activation; opening a dialog that
 *    was never triggered by a focused control (a route that renders it open
 *    from the start, say) has nowhere meaningful to send focus back to.
 */

/*
 * `:not([hidden])` and `:not([aria-hidden="true"])` are checked rather than
 * layout visibility (`offsetParent`, computed `display`): jsdom has no layout
 * engine, so any check that depends on one would silently exclude every
 * element in tests and never be caught. These attribute-based checks are
 * real signals in both environments rather than a browser-only guarantee
 * this component's own tests could not verify.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
]
  .map((selector) => `${selector}:not([hidden]):not([aria-hidden="true"])`)
  .join(",");

function focusableDescendants(container: HTMLElement): readonly HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  initialFocusRef?: RefObject<HTMLElement | null>,
): void {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const container = containerRef.current;
    if (container === null) {
      return;
    }

    // `document.body` itself is not a meaningful place to return to — most
    // commonly it means nothing had deliberate focus yet (a dialog rendered
    // open from the start, rather than opened by activating a trigger).
    const activeElement = document.activeElement;
    returnFocusRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null;

    const preferredFocus = initialFocusRef?.current;
    const firstFocusable = focusableDescendants(container)[0];
    (preferredFocus ?? firstFocusable ?? container).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || container === null) {
        return;
      }

      const focusable = focusableDescendants(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);

      const returnTo = returnFocusRef.current;
      if (returnTo === null) {
        return;
      }

      // Deferred rather than called inline: the container's own removal from
      // the document is what triggers this cleanup, and browsers settle
      // focus onto `document.body` as part of that removal. Calling
      // `.focus()` synchronously here can still be overwritten a moment
      // later by that settling; a microtask runs after the current commit's
      // DOM mutations finish, which is late enough to be the actual last
      // word.
      queueMicrotask(() => {
        if (document.contains(returnTo)) {
          returnTo.focus();
        }
      });
    };
  }, [active, containerRef, initialFocusRef]);
}
