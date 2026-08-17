import { Alert, EmptyState, ErrorState, InlineMessage } from "@components/feedback";
import { Button, Link } from "@components/ui";

import {
  CommandPaletteDemo,
  ConfirmDialogDemo,
  ConfirmDialogTypedDemo,
  DetailPanelDemo,
  DialogDemo,
  DrawerDemo,
  FormDialogDemo,
  NestedDialogDemo,
  ToastDemo,
} from "./MessagingDemos";

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
  {
    id: "empty-state",
    name: "EmptyState",
    group: "Composed",
    summary:
      "A pure layout primitive: variant picks a sensible default icon and nothing else. Title and description are always the caller's own copy, matching the tone guide's rule that a component must not invent feature copy internally.",
    states: [
      {
        id: "empty-state-first-use",
        name: "First use",
        description: "Names the benefit and offers the first safe action.",
        render: () => (
          <EmptyState
            variant="first-use"
            title="No projects yet"
            titleLevel={3}
            description="Add a project to organize related outcomes and Tasks."
            primaryAction={<Button size="sm">Add project</Button>}
          />
        ),
      },
      {
        id: "empty-state-filtered",
        name: "Filtered",
        description: "Names the filters and offers to clear them — never a forced action.",
        render: () => (
          <EmptyState
            variant="filtered"
            title="No tasks match these filters."
            secondaryAction={
              <Button size="sm" variant="secondary">
                Clear filters
              </Button>
            }
          />
        ),
      },
      {
        id: "empty-state-search",
        name: "Search",
        description: "Echoes the query only in this private view, plus a safe suggestion.",
        render: () => (
          <EmptyState
            variant="search"
            title={'No results for "Prepare weekly review".'}
            description="Try fewer words or add a new record."
          />
        ),
      },
      {
        id: "empty-state-permission",
        name: "Permission",
        description: "States unavailability without confirming whether the record exists.",
        render: () => (
          <EmptyState
            variant="permission"
            title="This item isn't available."
            secondaryAction={<Link href="#">Back to tasks</Link>}
          />
        ),
      },
      {
        id: "empty-state-archived",
        name: "Archived",
        description: "Confirms the condition; nothing to force here either.",
        render: () => (
          <EmptyState
            variant="archived"
            title="Nothing archived yet"
            description="Archived Projects and Tasks will appear here."
          />
        ),
      },
    ],
  },
  {
    id: "error-state",
    name: "ErrorState",
    group: "Composed",
    summary:
      "The tone guide's error formula — what happened, what was preserved, next action — mapped onto title/description/actions. Region composes Alert so the rest of the page stays visible around it; page is the larger centered block for a whole failed route.",
    states: [
      {
        id: "error-state-region-retry",
        name: "Region — partial failure",
        description: "The rest of the page stays visible around it.",
        render: () => (
          <ErrorState
            scope="region"
            title="Today's schedule couldn't load."
            description="Other Today sections are still available."
            onRetry={() => {}}
          />
        ),
      },
      {
        id: "error-state-page-retry",
        name: "Page — load failed",
        description: "A larger, centered block for a whole route or screen that failed.",
        render: () => (
          <ErrorState
            scope="page"
            title="LifeOS couldn't load Tasks right now."
            onRetry={() => {}}
          />
        ),
      },
      {
        id: "error-state-permission",
        name: "Permission — go back only",
        description: "States unavailability without confirming the record exists.",
        render: () => (
          <ErrorState
            scope="page"
            title="This item isn't available."
            description="It may have been removed, or you may not have access."
            onGoBack={() => {}}
          />
        ),
      },
      {
        id: "error-state-session",
        name: "Session expired",
        description: "Sign in replaces retry entirely — retrying an expired session cannot help.",
        render: () => (
          <ErrorState
            scope="page"
            title="Your session expired."
            description="Sign in again to continue."
            onSignIn={() => {}}
          />
        ),
      },
      {
        id: "error-state-unexpected",
        name: "Unexpected, with a reference id",
        description: "Never a stack trace or HTTP code — only the safe correlation id.",
        render: () => (
          <ErrorState
            scope="page"
            title="Something went wrong."
            description="Try again."
            onRetry={() => {}}
            correlationId="8f2c-91ad"
          />
        ),
      },
    ],
  },
  {
    id: "dialog",
    name: "Dialog",
    group: "Composed",
    summary:
      "A focus-trapping, Escape/backdrop-dismissible modal built entirely by hand rather than through <dialog>'s showModal()/close() — jsdom, this project's test environment, implements neither, which would make every behavior here untestable. Escape is routed only to the topmost of any nested pair.",
    states: [
      {
        id: "dialog-basic",
        name: "Basic",
        description:
          "Tab cycles within it; Escape or the backdrop closes it; focus returns to Add project.",
        render: () => <DialogDemo />,
      },
      {
        id: "dialog-nested",
        name: "Nested and non-dismissible",
        description:
          "Open the confirmation from inside the first dialog. Escape closes only the topmost layer; the inner one also disables Escape and backdrop dismissal entirely.",
        render: () => <NestedDialogDemo />,
      },
    ],
  },
  {
    id: "confirm-dialog",
    name: "ConfirmDialog",
    group: "Composed",
    summary:
      "Built on Dialog for an irreversible or high-impact action only — description is required, button labels always repeat the action, and focus defaults to Cancel rather than the danger button. pending/error stay caller-controlled, the same shape every composed field in this design system already uses.",
    states: [
      {
        id: "confirm-dialog-pending-error",
        name: "Pending, then a retryable error",
        description:
          "The first confirm fails and the dialog stays open with the error visible; confirm again to succeed.",
        render: () => <ConfirmDialogDemo />,
      },
      {
        id: "confirm-dialog-typed",
        name: "Typed confirmation",
        description:
          "The ticket's high-impact escalation: the danger action stays disabled until the exact text is typed.",
        render: () => <ConfirmDialogTypedDemo />,
      },
    ],
  },
  {
    id: "drawer",
    name: "Drawer",
    group: "Composed",
    summary:
      "A side panel on a wide viewport, a full-screen sheet below the small breakpoint — automatic by breakpoint, not a size a caller chooses. Shares Dialog's focus trap, Escape/backdrop rules and stacking; isDirty guards every dismissal path behind a discard confirmation.",
    states: [
      {
        id: "drawer-dirty-guard",
        name: "Dirty-state guard",
        description: "Type something, then try Escape or the backdrop.",
        render: () => <DrawerDemo />,
      },
    ],
  },
  {
    id: "detail-panel",
    name: "DetailPanel",
    group: "Composed",
    summary:
      "A Drawer for showing one record by id, synced to the URL with useDeepLinkParam rather than a router — reload the page or use the browser's own Back button and the panel stays correct. Composes Spinner for the loading gap and EmptyState's permission variant when the id doesn't resolve, without confirming which case it is.",
    states: [
      {
        id: "detail-panel-deep-link",
        name: "Deep link, loading and not found",
        description: "The second button opens an id with no matching fixture.",
        render: () => <DetailPanelDemo />,
      },
    ],
  },
  {
    id: "form-dialog",
    name: "FormDialog",
    group: "Composed",
    summary:
      "A create/edit form on Dialog. pending/error stay caller-controlled, the same shape ConfirmDialog already uses. Dialog funnels Escape, the backdrop and its own close button into one onClose, which is what lets the isDirty guard intercept all three — plus Cancel — at a single point behind a discard confirmation. Below the small breakpoint the dialog becomes a true full-screen sheet, distinct from Dialog's own baseline mobile bottom sheet.",
    states: [
      {
        id: "form-dialog-pending-error",
        name: "Dirty guard, pending, then a retryable error",
        description:
          "Type a name, then try Escape or the backdrop. Submitting the first attempt fails; submit again to succeed.",
        render: () => <FormDialogDemo />,
      },
    ],
  },
  {
    id: "command-palette",
    name: "CommandPalette",
    group: "Composed",
    summary:
      "A keyboard-opened, Dialog-hosted search-and-act surface. A single input drives a grouped listbox through aria-activedescendant, the same real-focus-stays-on-the-input pattern Combobox already uses. Typing timing reuses useSearchField (LOS-0402); no result data is cached inside the component — groups is entirely the caller's, and the active result is tracked by id so a narrowed result set can never leave a stale item highlighted.",
    states: [
      {
        id: "command-palette-grouped-search",
        name: "Grouped results with a debounced search",
        description:
          "Open with the button below or ⌘K / Ctrl+K from anywhere on this page. Type to filter, arrow through results — the disabled item and the group boundary are both skipped — and press Enter or click to select.",
        render: () => <CommandPaletteDemo />,
      },
    ],
  },
]);
