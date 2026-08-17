import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";

import { Icon } from "@components/ui";

import { resolveMenuPosition, type MenuAlign, type MenuPosition } from "./menuPosition";
import "./menu.css";

/**
 * Menu (LOS-0415).
 *
 * The ARIA menu-button pattern, built on real DOM focus rather than
 * `aria-activedescendant`: each item is a real `<button role="menuitem">`
 * with a roving `tabIndex`, so arrow keys move the platform's own focus and
 * every item works with nothing but a keyboard, the way a native `<select>`'s
 * popup does. Opening the menu — by click or by arrow key — moves focus onto
 * an item immediately, matching that same native expectation; a menu that
 * opens but leaves focus behind on the trigger is one extra keypress a
 * keyboard user should never have to spend.
 *
 * The trigger is cloned only to attach the wiring a menu button needs
 * (`id`, `aria-haspopup`, `aria-expanded`, `aria-controls`, an `onClick`
 * toggle) — the same "wrap without replacing" approach `Tooltip` (LOS-0326)
 * uses, so a caller's own `onClick` on the trigger is never silently dropped.
 * Focus is restored to it by id (`document.getElementById`, the same lookup
 * this file already uses for menu items) rather than a forwarded ref, which
 * sidesteps needing every possible trigger element to support ref forwarding.
 */

export type MenuItemDescriptor =
  | {
      readonly type: "item";
      readonly id: string;
      readonly label: string;
      readonly onSelect: () => void;
      readonly icon?: LucideIcon;
      readonly disabled?: boolean;
      /** Renders in the danger tone for an irreversible or high-impact action. */
      readonly destructive?: boolean;
    }
  | {
      readonly type: "separator";
      readonly id: string;
    };

interface MenuTriggerProps {
  readonly onClick?: (event: MouseEvent) => void;
  readonly onKeyDown?: (event: KeyboardEvent) => void;
  readonly ["aria-haspopup"]?: boolean | "menu";
  readonly ["aria-expanded"]?: boolean;
  readonly ["aria-controls"]?: string;
  readonly id?: string;
}

export interface MenuProps {
  /** The control that opens the menu. Cloned to receive an id and ARIA wiring. */
  readonly trigger: ReactElement<MenuTriggerProps>;
  readonly items: readonly MenuItemDescriptor[];
  /** The menu's accessible name, e.g. "Project actions". Never visible text. */
  readonly label: string;
  /** Extra, non-interactive content shown above the items, e.g. an identity block. */
  readonly header?: ReactNode;
  readonly align?: MenuAlign;
  readonly className?: string;
}

const DEFAULT_POSITION: MenuPosition = { side: "bottom", align: "start" };

export function Menu({ trigger, items, label, header, align = "start", className }: MenuProps) {
  const id = useId();
  const menuId = `${id}-menu`;
  const triggerId = `${id}-trigger`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [position, setPosition] = useState<MenuPosition>(DEFAULT_POSITION);

  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const typeaheadRef = useRef<{ text: string; timer: ReturnType<typeof setTimeout> | undefined }>({
    text: "",
    timer: undefined,
  });

  const enabledIndexes = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === "item" && !item.disabled)
    .map(({ index }) => index);

  const close = useCallback(
    (restoreFocus: boolean) => {
      setOpen(false);
      setActiveIndex(null);
      if (restoreFocus) {
        document.getElementById(triggerId)?.focus();
      }
    },
    [triggerId],
  );

  function openMenu(focusIndex: number | null) {
    setOpen(true);
    setActiveIndex(focusIndex);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) {
        return;
      }
      close(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, close]);

  // Measured once the popup is on the page, the same way Tooltip measures its
  // bubble: its real size is not knowable before layout.
  useEffect(() => {
    if (!open) {
      return;
    }

    const triggerRect = document.getElementById(triggerId)?.getBoundingClientRect();
    const menuRect = menuRef.current?.getBoundingClientRect();
    if (triggerRect === undefined || menuRect === undefined) {
      return;
    }

    setPosition(
      resolveMenuPosition(
        {
          top: triggerRect.top,
          left: triggerRect.left,
          width: triggerRect.width,
          height: triggerRect.height,
        },
        { width: menuRect.width, height: menuRect.height },
        { width: window.innerWidth, height: window.innerHeight },
        align,
      ),
    );
  }, [open, align, items, triggerId]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }
    document.getElementById(itemId(menuId, activeIndex))?.focus();
  }, [activeIndex, menuId]);

  function moveActive(delta: 1 | -1) {
    if (enabledIndexes.length === 0) {
      return;
    }
    const currentPosition = activeIndex === null ? -1 : enabledIndexes.indexOf(activeIndex);
    const from =
      currentPosition === -1 ? (delta === 1 ? -1 : enabledIndexes.length) : currentPosition;
    const next = (from + delta + enabledIndexes.length) % enabledIndexes.length;
    setActiveIndex(enabledIndexes[next] ?? null);
  }

  function activate(index: number) {
    const item = items[index];
    if (item === undefined || item.type !== "item" || item.disabled) {
      return;
    }
    close(true);
    item.onSelect();
  }

  function handleTriggerKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(enabledIndexes[0] ?? null);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(enabledIndexes[enabledIndexes.length - 1] ?? null);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent) {
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
        setActiveIndex(enabledIndexes[0] ?? null);
        return;
      case "End":
        event.preventDefault();
        setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? null);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (activeIndex !== null) {
          activate(activeIndex);
        }
        return;
      case "Escape":
        event.preventDefault();
        close(true);
        return;
      case "Tab":
        // Not prevented: a menu is not modal, so Tab is allowed to carry
        // focus on to whatever comes next in the page's own order.
        close(false);
        return;
      default:
        handleTypeahead(event);
    }
  }

  function handleTypeahead(event: KeyboardEvent) {
    if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const state = typeaheadRef.current;
    const key = event.key.toLowerCase();
    clearTimeout(state.timer);

    // A repeated single character cycles through its own matches, the same
    // as a native <select>: pressing "d" twice moves to the *next* item
    // starting with "d" rather than searching for an item starting with
    // "dd". Typing distinct characters in quick succession still narrows a
    // literal search instead.
    const isRepeat = state.text !== "" && [...state.text].every((char) => char === key);
    state.text = isRepeat ? state.text + key : key;
    state.timer = setTimeout(() => {
      state.text = "";
    }, 500);

    const searchText = isRepeat ? key : state.text;
    const startAt = activeIndex === null ? 0 : enabledIndexes.indexOf(activeIndex) + 1;
    const ordered = [...enabledIndexes.slice(startAt), ...enabledIndexes.slice(0, startAt)];

    const match = ordered.find((index) => {
      const item = items[index];
      return item?.type === "item" && item.label.toLowerCase().startsWith(searchText);
    });

    if (match !== undefined) {
      setActiveIndex(match);
    }
  }

  const clonedTrigger = cloneElement(trigger, {
    id: triggerId,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": menuId,
    onClick: (event: MouseEvent) => {
      trigger.props.onClick?.(event);
      if (open) {
        close(false);
      } else {
        openMenu(enabledIndexes[0] ?? null);
      }
    },
    onKeyDown: (event: KeyboardEvent) => {
      trigger.props.onKeyDown?.(event);
      handleTriggerKeyDown(event);
    },
  } as MenuTriggerProps);

  return (
    <div ref={rootRef} className={["lifeos-menu", className].filter(Boolean).join(" ")}>
      {clonedTrigger}

      {open ? (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={[
            "lifeos-menu__popup",
            `lifeos-menu__popup--${position.side}`,
            `lifeos-menu__popup--${position.align}`,
          ].join(" ")}
          onKeyDown={handleMenuKeyDown}
        >
          {header ? (
            <li role="presentation" className="lifeos-menu__header">
              {header}
            </li>
          ) : null}

          {items.map((item, index) => {
            if (item.type === "separator") {
              return <li key={item.id} role="separator" className="lifeos-menu__separator" />;
            }

            return (
              <li key={item.id} role="presentation">
                <button
                  id={itemId(menuId, index)}
                  type="button"
                  role="menuitem"
                  tabIndex={index === activeIndex ? 0 : -1}
                  disabled={item.disabled}
                  className={[
                    "lifeos-menu__item",
                    item.destructive && "lifeos-menu__item--destructive",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => setActiveIndex(item.disabled ? activeIndex : index)}
                  onClick={() => activate(index)}
                >
                  {item.icon ? <Icon icon={item.icon} decorative size="sm" /> : null}
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function itemId(menuId: string, index: number): string {
  return `${menuId}-item-${index}`;
}
