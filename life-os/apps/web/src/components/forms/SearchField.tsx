import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { Loader2, Search } from "lucide-react";

import { Icon, LiveRegion, TextInput } from "@components/ui";

import { useSearchField, type SearchFieldMode } from "./useSearchField";
import "./search-field.css";

/**
 * SearchField (LOS-0402).
 *
 * A `TextInput` composed with when-to-search timing (`useSearchField`), an
 * optional single-key shortcut to focus it from anywhere on the page, a
 * loading announcement, and a small panel offering recent searches or naming
 * an empty result — everything a search box needs beyond a plain text field,
 * short of a full results listbox. A control that needs keyboard-navigable
 * suggestions with roving focus is `Combobox` (LOS-0403); this component
 * intentionally stops short of that.
 */

export interface SearchFieldProps {
  readonly label: string;
  /** Hidden by default: a search field's placeholder usually carries the visible hint. */
  readonly labelHidden?: boolean;
  readonly placeholder?: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onSearch: (query: string) => void;
  /**
   * `debounced` searches automatically after a quiet pause; `submit` searches
   * only on Enter (or a caller-triggered submit). Enter always searches
   * immediately in either mode.
   */
  readonly mode?: SearchFieldMode;
  readonly debounceMs?: number;
  readonly loading?: boolean;
  /** Announced through a live region while `loading`. */
  readonly loadingLabel?: string;
  readonly clearLabel?: string;
  /**
   * A single, unmodified key (e.g. `"/"`) that focuses this field from
   * anywhere on the page, except while another editable element already has
   * focus — typing "/" into a different field must never steal it away.
   */
  readonly shortcutKey?: string;
  /** Shown when the field is focused and empty. Selecting one searches it immediately. */
  readonly recentSearches?: readonly string[];
  readonly recentSearchesLabel?: string;
  /**
   * The number of results for the current `value`, if known. `0` shows the
   * no-results message; `undefined` means the caller has not reported a
   * count yet (e.g. before the first search completes) and nothing is shown.
   */
  readonly resultCount?: number;
  /** Overrides the built-in `No results for "{value}".` message. */
  readonly noResultsMessage?: ReactNode;
  readonly className?: string;
}

export function SearchField({
  label,
  labelHidden = true,
  placeholder,
  value,
  onValueChange,
  onSearch,
  mode = "debounced",
  debounceMs,
  loading = false,
  loadingLabel = "Searching…",
  clearLabel,
  shortcutKey,
  recentSearches,
  recentSearchesLabel = "Recent searches",
  resultCount,
  noResultsMessage,
  className,
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  const { fieldProps } = useSearchField(value, {
    mode,
    ...(debounceMs === undefined ? {} : { debounceMs }),
    onSearch,
  });

  // A single unmodified key focuses the field from anywhere, unless the user
  // is already typing into something else — typing "/" into a different
  // field must never steal focus away from it.
  useEffect(() => {
    if (shortcutKey === undefined) {
      return;
    }

    function handleShortcut(event: KeyboardEvent) {
      if (
        event.key !== shortcutKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableElement(document.activeElement)
      ) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [shortcutKey]);

  function selectRecentSearch(item: string) {
    onValueChange(item);
    onSearch(item);
    inputRef.current?.focus();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    // A blur fired by moving focus to a button inside this same panel — a
    // recent-search item — must not close the panel before the click lands.
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsFocusWithin(false);
    }
  }

  const showRecent =
    isFocusWithin && value.trim() === "" && !loading && (recentSearches?.length ?? 0) > 0;
  const showNoResults = value.trim() !== "" && !loading && resultCount === 0;

  return (
    <div
      className={["lifeos-search-field", className].filter(Boolean).join(" ")}
      onFocus={() => setIsFocusWithin(true)}
      onBlur={handleBlur}
    >
      <TextInput
        ref={inputRef}
        type="search"
        label={label}
        labelHidden={labelHidden}
        {...(placeholder === undefined ? {} : { placeholder })}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onClear={() => onValueChange("")}
        {...(clearLabel === undefined ? {} : { clearLabel })}
        prefix={
          <Icon
            icon={loading ? Loader2 : Search}
            decorative
            size="sm"
            {...(loading ? { className: "lifeos-search-field__spinner" } : {})}
          />
        }
        {...(!loading && shortcutKey !== undefined
          ? { suffix: <kbd className="lifeos-search-field__shortcut">{shortcutKey}</kbd> }
          : {})}
        {...fieldProps}
      />

      {/* Decoupled from the decorative prefix icon above: this is the one
          place the waiting state is actually announced. */}
      <LiveRegion message={loading ? loadingLabel : ""} />

      {showRecent || showNoResults ? (
        <div className="lifeos-search-field__panel">
          {showRecent ? (
            <div>
              <p className="lifeos-search-field__panel-label">{recentSearchesLabel}</p>
              <ul className="lifeos-search-field__recent-list">
                {(recentSearches ?? []).map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      className="lifeos-search-field__recent-item"
                      // Keeps this click from ever registering as a blur on
                      // the field first, on browsers where mousedown alone
                      // would move focus before the click handler runs.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectRecentSearch(item)}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {showNoResults ? (
            <p className="lifeos-search-field__no-results">
              {noResultsMessage ?? `No results for "${value}".`}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function isEditableElement(element: Element | null): boolean {
  if (element === null) {
    return false;
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }

  return ["input", "textarea", "select"].includes(element.tagName.toLowerCase());
}
