import { Alert, InlineMessage } from "@components/feedback";
import { Button, Link } from "@components/ui";

import { ToastDemo } from "./MessagingDemos";

import type { CatalogEntry } from "./registry";

/*
 * Alert and InlineMessage entries (LOS-0408). Named apart from
 * `feedbackEntries.tsx` (LOS-0321 to LOS-0325's progress/waiting group) even
 * though both live under the "Feedback" idea, because that file name was
 * already taken by the catalog grouping before `components/feedback/`
 * existed as a real module boundary.
 */

export const MESSAGING_CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze([
  {
    id: "alert",
    name: "Alert",
    group: "Composed",
    summary:
      "A boxed message with room for a heading, an action and a dismiss control. Silent by default: only the caller knows whether a given render is page content or a fresh reaction worth interrupting for.",
    states: [
      {
        id: "alert-tones",
        name: "Tones",
        description: "One icon per tone, matching InlineMessage and the field-level error icon.",
        render: () => (
          <div className="specimen-stack">
            <Alert tone="info">Your changes sync automatically.</Alert>
            <Alert tone="success">Weekly Plan finalized.</Alert>
            <Alert tone="warning">You are near your storage limit.</Alert>
            <Alert tone="danger">LifeOS couldn't load Tasks right now.</Alert>
          </div>
        ),
      },
      {
        id: "alert-heading-action",
        name: "Heading, action and dismiss",
        description: "All three optional, composed independently of tone.",
        render: () => (
          <Alert
            tone="danger"
            heading="Save failed"
            action={<Button size="sm">Try again</Button>}
            onDismiss={() => {}}
          >
            We couldn't save this Task. Your changes are still here.
          </Alert>
        ),
      },
      {
        id: "alert-announce",
        name: "Announcement",
        description:
          "Defaults to silent. An assertive alert here is rendered exactly once, on this specimen's own mount — the same way a real submit failure would arrive.",
        render: () => (
          <Alert tone="danger" announce="alert" heading="Save failed">
            We couldn't save this Task. Your changes are still here.
          </Alert>
        ),
      },
    ],
  },
  {
    id: "inline-message",
    name: "InlineMessage",
    group: "Composed",
    summary:
      "The same four-tone icon-plus-text shape a field's own error already uses, generalized for anywhere else that needs it without an Alert's full weight.",
    states: [
      {
        id: "inline-message-tones",
        name: "Tones",
        description: "The same four tones and icons Alert uses.",
        render: () => (
          <div className="specimen-stack">
            <InlineMessage tone="info">Updated just now.</InlineMessage>
            <InlineMessage tone="success">Name is free.</InlineMessage>
            <InlineMessage tone="warning">3 attachments failed to upload.</InlineMessage>
            <InlineMessage tone="danger">
              A Label named &ldquo;Learning&rdquo; already exists.
            </InlineMessage>
          </div>
        ),
      },
      {
        id: "inline-message-in-context",
        name: "Beside other content",
        description: "Sits inline without the padding or border an Alert box would add.",
        render: () => (
          <div className="specimen-row">
            <Link href="#">Compare hosting options</Link>
            <InlineMessage tone="warning">Overdue</InlineMessage>
          </div>
        ),
      },
    ],
  },
  {
    id: "toast",
    name: "Toast",
    group: "Composed",
    summary:
      "Queued, nonblocking notifications composing Alert with auto-dismiss timing. Hover or focus pauses the countdown; a persistent toast (durationMs: null) is the alternative for a critical error that must not disappear on its own.",
    states: [
      {
        id: "toast-queue",
        name: "Queue, dedupe and pause",
        description:
          "Try pushing all three, then hover one — its countdown stops until the pointer leaves.",
        render: () => <ToastDemo />,
      },
    ],
  },
]);
