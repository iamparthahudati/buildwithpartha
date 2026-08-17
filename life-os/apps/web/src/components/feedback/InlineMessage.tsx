import type { ReactNode } from "react";

import { Icon, type MessageTone } from "@components/ui";

import { MESSAGE_TONE_ICONS, type MessageAnnouncement } from "./messageContract";
import "./inline-message.css";

/**
 * InlineMessage (LOS-0408).
 *
 * The icon-plus-colored-text shape `FieldMessages` already draws for one
 * field's error or description, generalized so anywhere else in the product
 * that needs the same shape — a row in a list, a line under a summary, a
 * note beside a control that is not a form field at all — does not
 * reimplement it. `Alert` is this same tone contract with more room around
 * it: a heading, an action, a dismiss control. Reach for `InlineMessage`
 * where that weight would be too much for the context.
 */

export interface InlineMessageProps {
  readonly tone: MessageTone;
  readonly children: ReactNode;
  /** See `MessageAnnouncement`. Defaults to not announcing itself at all. */
  readonly announce?: MessageAnnouncement;
  readonly className?: string;
}

export function InlineMessage({
  tone,
  children,
  announce = "none",
  className,
}: InlineMessageProps) {
  return (
    <span
      className={["lifeos-inline-message", `lifeos-inline-message--${tone}`, className]
        .filter(Boolean)
        .join(" ")}
      {...(announce === "none" ? {} : { role: announce === "alert" ? "alert" : "status" })}
    >
      <Icon icon={MESSAGE_TONE_ICONS[tone]} decorative size="sm" />
      {children}
    </span>
  );
}
