import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from "react";

import { resolveTooltipPosition, type TooltipSide } from "./tooltipPosition";
import "./tooltip.css";

/**
 * Tooltip (LOS-0326).
 *
 * A tooltip is supplementary and nothing else. It is invisible on touch, gone
 * the moment the pointer moves, unreachable by a magnifier user who has
 * scrolled past it, and absent from a printed page — so anything the user needs
 * in order to act must exist somewhere else too. `content` is typed as a plain
 * string for the same reason: a link or a button inside a tooltip can be seen
 * but, for most people, never reached.
 *
 * Hovering opens after a delay, because a pointer crossing a toolbar should not
 * flash five tooltips on the way. Focus opens immediately: a keyboard user has
 * already committed to the control, and making them wait is just a pause.
 *
 * The trigger is cloned only to receive `aria-describedby`. Its own handlers
 * are left alone — the listeners live on the wrapper and catch the same events
 * as they bubble, so wrapping a control in a tooltip cannot quietly replace
 * behaviour the caller already gave it.
 */

const DEFAULT_OPEN_DELAY_MS = 400;

export interface TooltipProps {
  /** Plain text. A tooltip cannot hold anything the user must interact with. */
  readonly content: string;
  readonly placement?: TooltipSide;
  readonly openDelayMs?: number;
  /** A single focusable element: the tooltip describes it. */
  readonly children: ReactElement<{ "aria-describedby"?: string }>;
  readonly className?: string;
}

export function Tooltip({
  content,
  placement = "top",
  openDelayMs = DEFAULT_OPEN_DELAY_MS,
  children,
  className,
}: TooltipProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ side: TooltipSide; shift: number }>({
    side: placement,
    shift: 0,
  });

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Escape must keep the tooltip shut while the pointer is still sitting on the
  // control, or it reopens immediately and the dismissal means nothing.
  const dismissedRef = useRef(false);

  const cancelOpenTimer = useCallback(() => {
    if (openTimerRef.current !== undefined) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = undefined;
    }
  }, []);

  const close = useCallback(() => {
    cancelOpenTimer();
    setOpen(false);
  }, [cancelOpenTimer]);

  useEffect(() => cancelOpenTimer, [cancelOpenTimer]);

  // Measured once the bubble is on the page: its size is not knowable before
  // the text is laid out, and the trigger may sit anywhere in the viewport.
  useEffect(() => {
    if (!open) {
      return;
    }

    const trigger = wrapperRef.current?.getBoundingClientRect();
    const bubble = bubbleRef.current?.getBoundingClientRect();
    if (trigger === undefined || bubble === undefined) {
      return;
    }

    setPosition(
      resolveTooltipPosition(
        { top: trigger.top, left: trigger.left, width: trigger.width, height: trigger.height },
        { width: bubble.width, height: bubble.height },
        { width: window.innerWidth, height: window.innerHeight },
        placement,
      ),
    );
  }, [open, placement, content]);

  return (
    /*
     * The wrapper is not the interactive element and does not pretend to be:
     * it has no role, no tab stop and no behaviour of its own. It listens only
     * so that hover, focus and Escape on the real control inside it reach this
     * component — Escape dismissal is the WCAG 1.4.13 requirement — without
     * replacing any handler the caller already gave that control.
     */
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <span
      ref={wrapperRef}
      className={["lifeos-tooltip", className].filter(Boolean).join(" ")}
      onPointerEnter={() => {
        if (dismissedRef.current || openTimerRef.current !== undefined) {
          return;
        }
        openTimerRef.current = setTimeout(() => {
          openTimerRef.current = undefined;
          setOpen(true);
        }, openDelayMs);
      }}
      onPointerLeave={() => {
        dismissedRef.current = false;
        close();
      }}
      onFocus={() => {
        dismissedRef.current = false;
        cancelOpenTimer();
        setOpen(true);
      }}
      onBlur={close}
      onKeyDown={(event: KeyboardEvent<HTMLSpanElement>) => {
        if (event.key === "Escape") {
          // Not stopped from propagating: Escape usually also means "close the
          // dialog I am in", and swallowing it here would break that.
          dismissedRef.current = true;
          close();
        }
      }}
    >
      {/*
        The tooltip describes the control; it never becomes its name, which the
        control already has and which speech-input users say out loud.
      */}
      {open ? cloneElement(children, { "aria-describedby": tooltipId }) : children}

      {open ? (
        <span
          ref={bubbleRef}
          id={tooltipId}
          role="tooltip"
          className={`lifeos-tooltip__bubble lifeos-tooltip__bubble--${position.side}`}
          style={{ "--lifeos-tooltip-shift": `${position.shift}px` } as CSSProperties}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
