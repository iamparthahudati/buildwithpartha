import type { ElementType, ReactNode } from "react";

import "./visually-hidden.css";

/**
 * VisuallyHidden and live regions (LOS-0327).
 *
 * Hiding text from sight without hiding it from assistive technology is one of
 * those things that is easy to get almost right. `display: none` and
 * `visibility: hidden` remove it from the accessibility tree as well;
 * `text-indent: -9999px` leaves a scrollable region on the page; a zero height
 * with `overflow: hidden` drops the text in some engines. The rule used here
 * clips a 1×1 box out of flow, which every current engine agrees to announce.
 *
 * Anything inside must stay non-interactive. A focusable element in a clipped
 * box takes focus the user cannot see, and the page appears to stop responding
 * to Tab — the skip link in `reset.css` is the deliberate exception, and it
 * becomes visible on focus rather than staying hidden.
 */

export interface VisuallyHiddenProps {
  readonly children: ReactNode;
  /** `span` by default; use `div` when the content is block-level. */
  readonly as?: "span" | "div";
  readonly id?: string;
}

export function VisuallyHidden({ children, as = "span", id }: VisuallyHiddenProps) {
  const Element = as as ElementType;

  return (
    <Element id={id} className="lifeos-visually-hidden">
      {children}
    </Element>
  );
}

export interface LiveRegionProps {
  /** The current message. An empty string leaves the region silent. */
  readonly message: string;
  /**
   * `polite` waits for a pause, `assertive` interrupts immediately. Assertive
   * is for something the user must act on now — a session about to expire, a
   * submission that failed — and nothing else, because an interruption they
   * did not need costs them their place.
   */
  readonly politeness?: "polite" | "assertive";
  /** Shows the message on screen as well. Off by default. */
  readonly visible?: boolean;
}

export function LiveRegion({ message, politeness = "polite", visible = false }: LiveRegionProps) {
  return (
    <div
      // The region is always rendered, even while empty. A live region that
      // appears at the same moment as its text is frequently not announced at
      // all: assistive technology has to be watching the node beforehand.
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
      // The message is read as a whole rather than word by word as it changes.
      aria-atomic="true"
      className={visible ? "lifeos-live-region" : "lifeos-visually-hidden"}
    >
      {message}
    </div>
  );
}
