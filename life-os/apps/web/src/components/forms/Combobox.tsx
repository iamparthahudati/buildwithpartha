import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

import { Field, IconButton, Spinner, fieldIds } from "@components/ui";

import "./combobox.css";

/**
 * Combobox (LOS-0403).
 *
 * An accessible single/multi-select built on a real text input, following the
 * ARIA 1.2 combobox-with-listbox pattern: the input keeps real DOM focus at
 * all times, and `aria-activedescendant` — not focus itself — points at
 * whichever option the keyboard is currently on. Moving focus into the
 * listbox is the older, more fragile pattern; keeping it on the input is what
 * lets the same field stay both a text box and a list at once.
 *
 * `Select` (LOS-0317) stays the default. Reach for `Combobox` only when a
 * native select cannot do the job — free-text filtering across many options,
 * multiple selection, or letting the user create an option that does not
 * exist yet — because everything a native select does for free (the
 * platform's own picker, full keyboard support, no JavaScript before it
 * renders) still has to be rebuilt here.
 */

export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

interface ComboboxSingleProps {
  readonly multiple?: false;
  readonly value: string | null;
  readonly onValueChange: (value: string | null) => void;
}

interface ComboboxMultipleProps {
  readonly multiple: true;
  readonly value: readonly string[];
  readonly onValueChange: (value: readonly string[]) => void;
}

type ComboboxSelectionProps = ComboboxSingleProps | ComboboxMultipleProps;

export type ComboboxProps = ComboboxSelectionProps & {
  readonly label: string;
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  readonly options: readonly ComboboxOption[];
  /** The typed filter text. Caller-controlled, like every other LifeOS field. */
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly placeholder?: string;
  /** `options` is being fetched for the current `query`. */
  readonly loading?: boolean;
  readonly loadingLabel?: string;
  readonly noResultsMessage?: ReactNode;
  /**
   * Offers "Create “{query}”" as the last row when there is no exact match.
   * Selecting it calls this instead of adding an existing option.
   */
  readonly onCreateOption?: (query: string) => void;
  readonly createOptionLabel?: (query: string) => string;
  /**
   * Beyond this many matches, only the first are rendered and a row explains
   * the rest are narrowed by typing, rather than every match landing in the
   * DOM at once. Not DOM virtualization — a windowing dependency is a
   * separate decision this ticket does not make — but the same honest limit
   * on what actually renders.
   */
  readonly virtualizeThreshold?: number;
  readonly disabled?: boolean;
  readonly id?: string;
  readonly className?: string;
};

type VisibleItem =
  | { readonly kind: "option"; readonly option: ComboboxOption }
  | { readonly kind: "create"; readonly query: string };

const DEFAULT_VIRTUALIZE_THRESHOLD = 50;

export function Combobox(props: ComboboxProps) {
  const {
    label,
    labelHidden = false,
    description,
    error,
    options,
    query,
    onQueryChange,
    placeholder,
    loading = false,
    loadingLabel = "Loading options…",
    noResultsMessage,
    onCreateOption,
    createOptionLabel = (currentQuery) => `Create "${currentQuery}"`,
    virtualizeThreshold = DEFAULT_VIRTUALIZE_THRESHOLD,
    disabled = false,
    id,
    className,
  } = props;

  const generatedId = useId();
  const controlId = id ?? generatedId;
  const ids = fieldIds(controlId, {
    hasDescription: Boolean(description),
    hasError: Boolean(error),
  });
  const listboxId = `${controlId}-listbox`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const selectedValues: readonly string[] = props.multiple
    ? props.value
    : props.value === null
      ? []
      : [props.value];
  // Not memoized: this filters small, in-memory option lists (the
  // `virtualizeThreshold` default caps how many ever render at once), so
  // recomputing every render is cheap and simpler than chasing a stale
  // memoization dependency.
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  const visibleOptions = filteredOptions.slice(0, virtualizeThreshold);
  const truncatedCount = filteredOptions.length - visibleOptions.length;

  const trimmedQuery = query.trim();
  const hasExactMatch = filteredOptions.some(
    (option) => option.label.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  const offerCreate =
    onCreateOption !== undefined && trimmedQuery !== "" && !hasExactMatch && !loading;

  const visibleItems: readonly VisibleItem[] = useMemo(() => {
    const items: VisibleItem[] = visibleOptions.map((option) => ({ kind: "option", option }));
    if (offerCreate) {
      items.push({ kind: "create", query: trimmedQuery });
    }
    return items;
  }, [visibleOptions, offerCreate, trimmedQuery]);

  const showNoResults =
    !loading && !offerCreate && trimmedQuery !== "" && filteredOptions.length === 0;
  const isListbox = visibleItems.length > 0;

  // `activeIndex` can outlive the list it pointed into — a keystroke that
  // narrows the results is exactly this case — so nothing downstream reads it
  // directly. This derived value is what actually renders and drives
  // `aria-activedescendant`; an effect that wrote the clamp back into state
  // would just cause an extra render to reach the same value.
  const activeVisibleIndex =
    activeIndex !== null && activeIndex < visibleItems.length ? activeIndex : null;

  useEffect(() => {
    if (activeVisibleIndex === null) {
      return;
    }
    document
      .getElementById(itemId(listboxId, activeVisibleIndex))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeVisibleIndex, listboxId]);

  function commitSelection(item: VisibleItem) {
    if (item.kind === "create") {
      onCreateOption?.(item.query);
      onQueryChange("");
      setOpen(false);
      inputRef.current?.focus();
      return;
    }

    if (item.option.disabled) {
      return;
    }

    if (props.multiple) {
      const already = props.value.includes(item.option.value);
      props.onValueChange(
        already
          ? props.value.filter((value) => value !== item.option.value)
          : [...props.value, item.option.value],
      );
      // Left open: picking more than one option is the entire point of
      // multi-select, so closing after the first choice would undo it.
      onQueryChange("");
      inputRef.current?.focus();
      return;
    }

    props.onValueChange(item.option.value);
    onQueryChange("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeValue(value: string) {
    if (props.multiple) {
      props.onValueChange(props.value.filter((selected) => selected !== value));
    } else {
      props.onValueChange(null);
    }
    inputRef.current?.focus();
  }

  function moveActive(delta: 1 | -1) {
    if (visibleItems.length === 0) {
      return;
    }
    setOpen(true);
    setActiveIndex((current) => {
      const from = current ?? (delta === 1 ? -1 : visibleItems.length);
      const next = (from + delta + visibleItems.length) % visibleItems.length;
      return next;
    });
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
        if (open) {
          event.preventDefault();
          setActiveIndex(visibleItems.length === 0 ? null : 0);
        }
        return;
      case "End":
        if (open) {
          event.preventDefault();
          setActiveIndex(visibleItems.length === 0 ? null : visibleItems.length - 1);
        }
        return;
      case "Enter": {
        if (!open || activeVisibleIndex === null) {
          return;
        }
        event.preventDefault();
        const item = visibleItems[activeVisibleIndex];
        if (item !== undefined) {
          commitSelection(item);
        }
        return;
      }
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(null);
        }
        return;
      case "Backspace":
        // A well-known tag-input shortcut: Backspace against an empty query
        // removes the most recently added chip, without requiring the mouse.
        if (props.multiple && query === "" && props.value.length > 0) {
          removeValue(props.value[props.value.length - 1] as string);
        }
        return;
      default:
        return;
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
      setActiveIndex(null);
    }
  }

  const activeItemId =
    activeVisibleIndex === null ? undefined : itemId(listboxId, activeVisibleIndex);

  return (
    <Field
      ids={ids}
      label={label}
      labelHidden={labelHidden}
      {...(description ? { description } : {})}
      {...(error ? { error } : {})}
      disabled={disabled}
      {...(className ? { className } : {})}
    >
      <div className="lifeos-combobox" onBlur={handleBlur}>
        <div className="lifeos-field__control lifeos-combobox__control">
          {selectedOptions.length > 0 ? (
            <ul className="lifeos-combobox__chips">
              {selectedOptions.map((option) => (
                <li key={option.value}>
                  <span className="lifeos-combobox__chip">
                    {option.label}
                    <IconButton
                      icon={X}
                      label={`Remove ${option.label}`}
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => removeValue(option.value)}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <input
            ref={inputRef}
            role="combobox"
            type="text"
            id={ids.controlId}
            className="lifeos-field__element"
            value={query}
            disabled={disabled}
            autoComplete="off"
            {...(placeholder === undefined ? {} : { placeholder })}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            {...(activeItemId === undefined ? {} : { "aria-activedescendant": activeItemId })}
            aria-describedby={ids.describedBy}
            aria-invalid={error ? true : undefined}
          />

          {loading ? <Spinner label={loadingLabel} size="sm" /> : null}
        </div>

        {open ? (
          <ul
            id={listboxId}
            className="lifeos-combobox__listbox"
            // A listbox that owns no option is invalid ARIA, so the role is
            // only added once there is at least one real option or
            // create-row to own it. While there is nothing to select, this
            // stays a plain list instead — which is why its status rows below
            // stay plain `<li>`s rather than `role="presentation"` in that
            // case: a presentation-role item inside a *plain* list breaks the
            // list's own required listitem content just as badly as an empty
            // listbox does. The element itself always exists while open, so
            // `aria-controls` on the input never points at a ghost id.
            {...(isListbox
              ? {
                  role: "listbox",
                  "aria-label": label,
                  ...(props.multiple ? { "aria-multiselectable": true } : {}),
                }
              : {})}
          >
            {loading ? (
              <li
                className="lifeos-combobox__status"
                {...(isListbox ? { role: "presentation" } : {})}
              >
                {loadingLabel}
              </li>
            ) : null}

            {visibleItems.map((item, index) => {
              const selected = item.kind === "option" && selectedValues.includes(item.option.value);

              return (
                // No keyboard listener on this element by design: the ARIA
                // combobox pattern keeps real focus on the input at all
                // times and drives selection through its own onKeyDown
                // handler via aria-activedescendant, never through focus
                // landing on the option itself. onClick here covers the
                // pointer path only.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={item.kind === "option" ? item.option.value : "__create__"}
                  id={itemId(listboxId, index)}
                  role="option"
                  aria-selected={selected}
                  {...(item.kind === "option" && item.option.disabled
                    ? { "aria-disabled": true }
                    : {})}
                  className={[
                    "lifeos-combobox__option",
                    index === activeVisibleIndex && "is-active",
                    selected && "is-selected",
                    item.kind === "option" && item.option.disabled && "is-disabled",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitSelection(item)}
                >
                  {item.kind === "create" ? createOptionLabel(item.query) : item.option.label}
                </li>
              );
            })}

            {/*
              None of these rows is a selectable option, so none carries the
              option role. Whenever the list around them *is* a listbox,
              `role="presentation"` removes each from the accessibility tree
              instead of leaving it as an unlabelled option; whenever it is
              not, they stay ordinary list items instead (see above).
            */}
            {showNoResults ? (
              <li
                className="lifeos-combobox__status"
                {...(isListbox ? { role: "presentation" } : {})}
              >
                {noResultsMessage ?? `No results for "${query}".`}
              </li>
            ) : null}

            {truncatedCount > 0 ? (
              <li
                className="lifeos-combobox__status"
                {...(isListbox ? { role: "presentation" } : {})}
              >
                Showing {visibleOptions.length} of {filteredOptions.length}. Type to narrow further.
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}

function itemId(listboxId: string, index: number): string {
  return `${listboxId}-item-${index}`;
}
