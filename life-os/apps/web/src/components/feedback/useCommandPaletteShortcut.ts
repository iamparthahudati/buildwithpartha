import { useEffect } from "react";

/**
 * Opens a `CommandPalette` (LOS-0426) from anywhere on the page via
 * Cmd/Ctrl+<key> (Cmd/Ctrl+K by default).
 *
 * The modifier is what makes this shortcut safe to fire globally, unlike
 * `SearchField`'s own single, unmodified `shortcutKey` (LOS-0402): a bare
 * letter would steal a keystroke out of every text field on the page, so
 * that one only fires while nothing editable has focus. Cmd/Ctrl+K cannot
 * collide with normal typing the same way — it is the same reserved
 * combination other applications already use for the identical purpose —
 * so this fires regardless of what currently has focus, editable or not.
 * `event.repeat` is still checked so holding the combination down cannot
 * fire `onOpen` more than once.
 */

export interface UseCommandPaletteShortcutOptions {
  /** The letter combined with Cmd (Mac) / Ctrl (elsewhere). Defaults to `"k"`. */
  readonly key?: string;
  readonly enabled?: boolean;
}

export function useCommandPaletteShortcut(
  onOpen: () => void,
  options: UseCommandPaletteShortcutOptions = {},
): void {
  const { key = "k", enabled = true } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleShortcut(event: KeyboardEvent) {
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (!modifierPressed || event.repeat || event.key.toLowerCase() !== key.toLowerCase()) {
        return;
      }
      event.preventDefault();
      onOpen();
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [key, enabled, onOpen]);
}
