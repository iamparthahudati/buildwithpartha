/**
 * Which open `Dialog` is topmost (LOS-0412).
 *
 * Not React state: nothing renders differently because of it, so it is a
 * plain module-level array rather than a context — the same reasoning
 * `formFieldRegistry.ts` gives for splitting its write side into stable
 * callbacks instead of triggering a re-render on every registration.
 *
 * The problem this exists to prevent: a dialog opened from inside another
 * already-open dialog (a nested `ConfirmDialog`, say) and a bare Escape
 * keydown listener per instance. Both dialogs are mounted at once, so both
 * listeners would fire on a single Escape press and close both layers
 * together — the exact "nested action" failure the ticket names. Each
 * `Dialog` registers itself here on mount and checks `isTopDialog` before
 * acting on Escape or a backdrop click, so only the one the user is actually
 * looking at responds.
 */

let stack: readonly string[] = [];

export function pushDialog(id: string): void {
  stack = [...stack, id];
}

export function popDialog(id: string): void {
  stack = stack.filter((entry) => entry !== id);
}

export function isTopDialog(id: string): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

/** How many dialogs are currently open — used to scope the body scroll lock to the last one closing. */
export function openDialogCount(): number {
  return stack.length;
}
