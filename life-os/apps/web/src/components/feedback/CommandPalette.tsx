import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Icon, Spinner } from "@components/ui";
import { useSearchField } from "@components/forms";

import { Dialog } from "./Dialog";
import "./command-palette.css";

/**
 * CommandPalette (LOS-0426).
 *
 * A keyboard-opened, `Dialog`-hosted search-and-act surface: a single input
 * drives a grouped `listbox` through `aria-activedescendant`, the same real-
 * focus-stays-on-the-input pattern `Combobox` (LOS-0403) already uses, rather
 * than moving focus onto each result. `Dialog` (LOS-0412) supplies the focus
 * trap, Escape/backdrop dismissal and return-focus for free — its own
 * `useFocusTrap` doc comment names a command palette as an intended consumer.
 *
 * Typing timing reuses `useSearchField` (LOS-0402) — `query`/`onQueryChange`
 * is the raw typed text on every keystroke, and `onSearch` fires only after
 * its debounce (or immediately on Enter/submit), the same contract
 * `SearchField` already gives callers doing an async lookup.
 *
 * "No unauthorized cached result" (the ticket's own wording) is read as: this
 * component holds no result data of its own. `groups` is entirely the
 * caller's, same as `options` on `Combobox` — nothing here fetches, filters
 * or remembers a previous query's results. The one piece of UI state this
 * component *does* keep, which result is highlighted, is stored by that
 * item's `id` rather than its position in the list, so a fresh or narrowed
 * `groups` array can never leave a stale item highlighted, nor silently
 * highlight a different, unrelated item that now happens to occupy the same
 * index — the same failure shape `Combobox`'s `activeVisibleIndex` was
 * already written to avoid.
 */

export interface CommandPaletteItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: LucideIcon;
  /** A display-only hint, e.g. `"⌘N"` — not a live, bound keyboard shortcut. */
  readonly shortcut?: string;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
}

export interface CommandPaletteGroup {
  readonly id: string;
  readonly heading: string;
  readonly items: readonly CommandPaletteItem[];
}

export interface CommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** The raw typed text, updated on every keystroke. Caller-controlled. */
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  /** Fired after `useSearchField`'s debounce (or immediately on Enter/submit). */
  readonly onSearch: (query: string) => void;
  readonly groups: readonly CommandPaletteGroup[];
  /** `groups` is being fetched for the current `query`. */
  readonly loading?: boolean;
  readonly loadingLabel?: string;
  readonly emptyMessage?: ReactNode;
  readonly placeholder?: string;
  /** The dialog's accessible name. Never visible text — the input has its own. */
  readonly label?: string;
  readonly debounceMs?: number;
  readonly className?: string;
}

interface FlatEntry {
  readonly groupId: string;
  readonly item: CommandPaletteItem;
}

export function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  onSearch,
  groups,
  loading = false,
  loadingLabel = "Searching…",
  emptyMessage,
  placeholder = "Search or run a command…",
  label = "Command palette",
  debounceMs,
  className,
}: CommandPaletteProps) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { fieldProps } = useSearchField(query, {
    mode: "debounced",
    ...(debounceMs === undefined ? {} : { debounceMs }),
    onSearch,
  });

  const flatEntries: readonly FlatEntry[] = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => ({ groupId: group.id, item }))),
    [groups],
  );
  const navigableIds = useMemo(
    () => flatEntries.filter((entry) => !entry.item.disabled).map((entry) => entry.item.id),
    [flatEntries],
  );

  // Not written back into state by an effect: `activeId` can outlive the
  // list it pointed into (a query that narrows the results is exactly this
  // case), so nothing downstream reads the raw state directly. This derived
  // value is what actually renders — the same `activeVisibleIndex` technique
  // `Combobox` already uses for the identical reason.
  const effectiveActiveId = activeId !== null && navigableIds.includes(activeId) ? activeId : null;

  function moveActive(delta: 1 | -1) {
    if (navigableIds.length === 0) {
      return;
    }
    const currentPosition =
      effectiveActiveId === null ? -1 : navigableIds.indexOf(effectiveActiveId);
    const from =
      currentPosition === -1 ? (delta === 1 ? -1 : navigableIds.length) : currentPosition;
    const next = (from + delta + navigableIds.length) % navigableIds.length;
    setActiveId(navigableIds[next] ?? null);
  }

  // Every close path — Escape, the backdrop, the header's close button, or a
  // result being activated — runs through here, so a reopened palette always
  // starts with nothing highlighted rather than remembering where a previous
  // session left off. This is the other half of "no unauthorized cached
  // result" alongside the id-based `effectiveActiveId` derivation above: not
  // just safe against a stale id from a *changed* result set, but never
  // showing a stale highlight at all once a session has actually ended —
  // the same guarantee Combobox's own close handling already gives its
  // `activeIndex`.
  function handleClose() {
    setActiveId(null);
    onClose();
  }

  function activate(itemId: string) {
    const entry = flatEntries.find((candidate) => candidate.item.id === itemId);
    if (entry === undefined || entry.item.disabled) {
      return;
    }
    entry.item.onSelect();
    handleClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        moveActive(-1);
        return;
      case "Home":
        event.preventDefault();
        setActiveId(navigableIds[0] ?? null);
        return;
      case "End":
        event.preventDefault();
        setActiveId(navigableIds[navigableIds.length - 1] ?? null);
        return;
      case "Enter":
        // An active result takes priority; only once nothing is highlighted
        // does Enter fall through to useSearchField's own immediate-submit
        // override, the same behavior SearchField gives a caller in "submit"
        // mode or mid-debounce in "debounced" mode.
        if (effectiveActiveId !== null) {
          event.preventDefault();
          activate(effectiveActiveId);
          return;
        }
        fieldProps.onKeyDown(event);
        return;
      default:
        return;
    }
  }

  const trimmedQuery = query.trim();
  const showEmpty = !loading && flatEntries.length === 0 && trimmedQuery !== "";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={label}
      titleHidden
      size="lg"
      initialFocusRef={inputRef}
      className={["lifeos-command-palette", className].filter(Boolean).join(" ")}
    >
      <div className="lifeos-command-palette__search">
        <Icon icon={Search} decorative size="sm" />
        <input
          ref={inputRef}
          role="combobox"
          type="text"
          className="lifeos-command-palette__input"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={label}
          onChange={(event) => onQueryChange(event.target.value)}
          onCompositionStart={fieldProps.onCompositionStart}
          onCompositionEnd={fieldProps.onCompositionEnd}
          onKeyDown={handleKeyDown}
          aria-expanded={true}
          aria-controls={listboxId}
          aria-autocomplete="list"
          {...(effectiveActiveId === null
            ? {}
            : { "aria-activedescendant": optionId(listboxId, effectiveActiveId) })}
        />
        {loading ? <Spinner label={loadingLabel} size="sm" /> : null}
      </div>

      <ul id={listboxId} role="listbox" aria-label={label} className="lifeos-command-palette__list">
        {groups.map((group) =>
          group.items.length === 0 ? null : (
            <li key={group.id} role="presentation">
              <p className="lifeos-command-palette__heading">{group.heading}</p>
              <ul role="presentation" className="lifeos-command-palette__group">
                {group.items.map((item) => (
                  // No keyboard listener here by design: the ARIA combobox
                  // pattern keeps real focus on the input at all times and
                  // drives activation through its own onKeyDown handler via
                  // aria-activedescendant. onClick covers the pointer path.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <li
                    key={item.id}
                    id={optionId(listboxId, item.id)}
                    role="option"
                    aria-selected={item.id === effectiveActiveId}
                    {...(item.disabled ? { "aria-disabled": true } : {})}
                    className={[
                      "lifeos-command-palette__option",
                      item.id === effectiveActiveId && "is-active",
                      item.disabled && "is-disabled",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={() => {
                      if (!item.disabled) {
                        setActiveId(item.id);
                      }
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => activate(item.id)}
                  >
                    {item.icon ? <Icon icon={item.icon} decorative size="sm" /> : null}
                    <span className="lifeos-command-palette__option-body">
                      <span className="lifeos-command-palette__option-label">{item.label}</span>
                      {item.description ? (
                        <span className="lifeos-command-palette__option-description">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                    {item.shortcut ? (
                      <kbd className="lifeos-command-palette__shortcut">{item.shortcut}</kbd>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          ),
        )}

        {loading ? (
          <li className="lifeos-command-palette__status" role="presentation">
            {loadingLabel}
          </li>
        ) : null}

        {showEmpty ? (
          <li className="lifeos-command-palette__status" role="presentation">
            {emptyMessage ?? `No results for "${query}".`}
          </li>
        ) : null}
      </ul>
    </Dialog>
  );
}

function optionId(listboxId: string, itemId: string): string {
  return `${listboxId}-option-${itemId}`;
}
