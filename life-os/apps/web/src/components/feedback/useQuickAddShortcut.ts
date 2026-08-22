import { useEffect } from "react";

/**
 * useQuickAddShortcut (LOS-0604).
 *
 * Listens for global keydown events to open the Quick Add dialog.
 * Supported keys:
 * - Bare "q" (when no editable elements like input or textarea are focused).
 * - "Option+Q" / "Alt+Q" as a modifier alternative.
 *
 * Safeguards:
 * - "Keyboard shortcut does not fire while typing" (the ticket's own wording):
 *   we check if the active element is an input, textarea, or contenteditable.
 * - event.repeat is checked to prevent duplicate triggering when holding down the key.
 */

export interface UseQuickAddShortcutOptions {
  readonly enabled?: boolean;
}

export function useQuickAddShortcut(
  onOpen: () => void,
  options: UseQuickAddShortcutOptions = {},
): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleShortcut(event: KeyboardEvent) {
      // Determine if focus is in an editable element
      const activeEl = document.activeElement;
      const isEditable =
        activeEl !== null &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true");

      if (isEditable) {
        return;
      }

      // Check if the key pressed is "q" or "Q"
      const isQ = event.key.toLowerCase() === "q";
      if (!isQ || event.repeat) {
        return;
      }

      // Accept a bare "q" (no modifiers) or Alt/Option + "q"
      const hasNoModifiers = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
      const hasAltModifier = event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey;

      if (hasNoModifiers || hasAltModifier) {
        event.preventDefault();
        onOpen();
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [enabled, onOpen]);
}
