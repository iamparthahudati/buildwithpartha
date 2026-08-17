import { AlertCircle, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";

import type { MessageTone } from "@components/ui";

/**
 * What `Alert` and `InlineMessage` share (LOS-0408): one icon per tone, and
 * the role a message announces itself with. Kept apart from both components
 * so this file exports only data/types and each of theirs exports only a
 * component, the same reason `colorIconPalette.ts` sits apart from
 * `ColorIconPicker.tsx`.
 */

export const MESSAGE_TONE_ICONS: Readonly<Record<MessageTone, LucideIcon>> = Object.freeze({
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: AlertCircle,
});

/**
 * How a message announces itself to assistive technology on mount.
 *
 * `"none"` — the default. A message that is simply part of the page, present
 * when it loads, is read in normal document order; giving it a live-region
 * role would announce it as an interruption the instant the page appears,
 * which the tone guide already forbids doing twice over for one outcome
 * ("Do not show a success toast and a duplicate inline success message
 * unless one serves a distinct accessibility/context purpose").
 *
 * `"status"` — a polite live region, for a message that appears in response
 * to something the user did but is not urgent (a save confirmed).
 *
 * `"alert"` — an assertive live region, for a message the user must see the
 * moment it appears (a save that failed). Reserved for messages a caller
 * mounts *because* something just happened, never for content that is simply
 * part of the initial page.
 *
 * The choice is the caller's, not something tone can decide on its own: a
 * `danger` message might be permanent page content ("This account is
 * suspended") just as easily as a fresh submit error, and only the caller
 * knows which one it is.
 */
export type MessageAnnouncement = "none" | "status" | "alert";
