import type { ReactNode } from "react";
import { X } from "lucide-react";

import { Icon, IconButton, type MessageTone } from "@components/ui";

import { MESSAGE_TONE_ICONS, type MessageAnnouncement } from "./messageContract";
import "./alert.css";

/**
 * Alert (LOS-0408).
 *
 * A boxed message with room for a heading, an action and a dismiss control —
 * `InlineMessage` is the same four tones without that weight, for a context
 * an alert box would overwhelm.
 *
 * `announce` defaults to `"none"`, not to something tone-appropriate. Alerts
 * are almost always rendered conditionally by their caller (`{error && (...)}`),
 * and only the caller knows whether a given render is content that was simply
 * part of the page, or a fresh reaction to something the user just did — a
 * `danger` alert reading "This account is suspended" is permanent page
 * content, while one reading "Save failed" exists *because* the save just
 * failed. Picking `"alert"` by default for every danger-toned message would
 * announce the first case as an interruption on every mount, which is the
 * exact duplicate-announcement failure this component exists to avoid.
 */

export interface AlertProps {
  readonly tone: MessageTone;
  /** A short lead-in above the body, e.g. "Save failed". Not required. */
  readonly heading?: string;
  readonly children: ReactNode;
  /** Rendered after the body — typically a `Button` or `Link`. */
  readonly action?: ReactNode;
  readonly onDismiss?: () => void;
  readonly dismissLabel?: string;
  /** See `MessageAnnouncement`. Defaults to not announcing itself at all. */
  readonly announce?: MessageAnnouncement;
  readonly className?: string;
}

export function Alert({
  tone,
  heading,
  children,
  action,
  onDismiss,
  dismissLabel = "Dismiss",
  announce = "none",
  className,
}: AlertProps) {
  return (
    <div
      className={["lifeos-alert", `lifeos-alert--${tone}`, className].filter(Boolean).join(" ")}
      {...(announce === "none" ? {} : { role: announce === "alert" ? "alert" : "status" })}
    >
      <Icon icon={MESSAGE_TONE_ICONS[tone]} decorative className="lifeos-alert__icon" />

      <div className="lifeos-alert__body">
        {heading ? <p className="lifeos-alert__heading">{heading}</p> : null}
        <div className="lifeos-alert__message">{children}</div>
        {action ? <div className="lifeos-alert__action">{action}</div> : null}
      </div>

      {onDismiss ? (
        <IconButton
          icon={X}
          label={dismissLabel}
          variant="ghost"
          size="sm"
          className="lifeos-alert__dismiss"
          onClick={onDismiss}
        />
      ) : null}
    </div>
  );
}
