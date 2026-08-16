# Critical interaction prototype

- Ticket: LOS-0110
- Status: low-fidelity interaction contract
- Surfaces: large (1440px), tablet (1024px), small (390px), keyboard-only and touch

## Purpose and evidence boundary

This document turns the static LOS-0109 wireframes into deterministic state flows. Each flow was walked through against the route map, critical journeys, state patterns and component ownership map using normal, slow-network, offline, authorization-expiry and version-conflict scenarios.

This is an expert specification walkthrough, not evidence from external usability participants. Owner review remains part of LOS-0114, and implementation usability is rechecked at the relevant feature gates.

## Shared interaction rules

- A user action enters a visible pending state only after validation passes.
- A mutation is called Saved/Created/Completed only after server acknowledgement. Offline-safe work is labelled Device draft or Queued.
- Repeated submit, retry or reconnect uses an idempotency key and cannot create a second record.
- Route, dialog and drawer transitions have a deliberate focus destination and restoration target.
- Pointer gestures enhance direct manipulation; every operation has a named button/menu/form path.
- A failed action preserves input and identifies what happened, what remained safe and what to do next.
- Authentication expiry closes private overlays, clears private query data and retains only approved user-scoped drafts.

## Prototype 1 — primary navigation

### Large/tablet flow

```text
Route A / nav item A active
  -> activate nav item B
  -> if clean: update route
       -> announce page title once
       -> focus B page heading
       -> mark B aria-current=page
  -> if dirty: Save / Discard / Stay
       -> Save succeeds or Discard: update route as above
       -> Save fails or Stay: remain on A with draft intact
```

The collapsed tablet rail keeps labels available through an accessible name and expandable tooltip, but expansion is not required to navigate. The device-local collapsed preference never enters account data.

### Mobile flow

```text
Menu button
  -> modal drawer opens; initial focus = current destination
  -> Tab stays inside drawer; page behind is inert
  -> choose a different destination
       -> close drawer
       -> update route
       -> focus new page heading
  -> choose current destination / Close / Escape
       -> close drawer
       -> restore focus to Menu
```

Result: Pass after specifying separate focus behavior for same-route close and new-route navigation. Deep links, browser Back and dirty-form interception remain consistent with the route contract.

## Prototype 2 — Quick Add

Quick Add opens a modal dialog on large/tablet and a full-screen sheet on small. Initial focus goes to the type chooser, not an arbitrary form field.

```text
Closed
  -> Open from utility bar or discoverable shortcut
  -> Choose type
       common: Task / Brain Dump Item / Time Block / Note
       more: Project / Habit Entry / Goal Check-in
  -> Compose compact fields
       -> More options: preserve values and open canonical full form
       -> Close with content: Discard / Keep editing
       -> Submit
            -> invalid: summary + first invalid field
            -> pending: fields remain visible; duplicate submit blocked
            -> confirmed: close, restore trigger, announce named record
            -> supported offline: label Device draft/Queued; never Saved
            -> failed: retain fields and offer Retry
```

Switching types during one open session retains each type's temporary fields until the dialog closes. A successful create clears only the submitted type. Unsafe offline types or fields are disabled with an explanation rather than silently reduced.

Result: Changed from a seven-tab presentation to a common-type chooser plus More group so the small viewport has no horizontal type strip and first-time users can understand the choices.

## Prototype 3 — task details from a list

```text
Tasks list (query/page/scroll/row focus snapshot)
  -> open task
       large: canonical detail URL + side panel; list remains visible
       small: canonical detail URL + full route
  -> change tab: stable ?tab= value; focus tab panel heading
  -> edit
       -> Save confirmed: update detail and affected list fields
       -> 409: preserve local values; Compare / Copy mine / Reload latest
       -> close while dirty: Save / Discard / Stay
  -> close/back
       -> restore exact list query/page/scroll
       -> focus originating row, or list heading if row no longer exists
```

A deleted, archived or permission-lost record never leaves a blank panel. It shows the safe explanation and returns to the preserved list context.

Result: Pass after defining the missing-row restoration fallback and making the detail tab part of stable URL state.

## Prototype 4 — time-block move and resize

### Pointer enhancement

```text
Press block / resize handle
  -> visible ghost + exact proposed start/end/duration
  -> drag within allowed timeline
  -> drop
       invalid/DST-invalid: do not mutate; explain and open exact-time form
       overlap: conflict dialog (Edit / Open existing / Save intentionally)
       valid: optimistic provisional position + Saving
            -> server confirms: Saved + Undo action
            -> server rejects/version conflict: restore prior position;
               preserve proposal in Move/Resize form
```

### Keyboard, assistive-technology and touch path

The block action menu exposes Move, Resize, Duplicate and Delete. Move/Resize opens a labelled form with date, start, end/duration, timezone context and conflict result. Touch uses this form as the primary path; touch drag is not required for v1.

The gesture begins only from the block or a visible resize handle, never from the whole scrollable timeline. Auto-scroll is bounded. Exact time text and conflict status do not rely on color.

Result: Changed to use optimistic movement only as provisional presentation until the server confirms. A rejection returns the block and keeps the proposed values recoverable.

## Prototype 5 — focus start and recovery

```text
Idle
  -> Start(task/block context)
  -> Starting (one request/idempotency key)
       -> Running (server session ID + authoritative startedAt)
       -> failed: Idle with preserved context and Retry

Running <-> Pausing/Resuming <-> Paused
  -> network loss: Reconnecting; elapsed display may continue locally
       -> reconnect fetches active server session and corrects display
       -> another client changed state: show server state + explanation
  -> refresh/background/sleep: bootstrap active session; derive elapsed
  -> Complete/Cancel: exact effects confirmation
       -> one server transition; duplicate responses reconcile by session ID
       -> Completed/Cancelled summary; Today/task/block queries refresh
```

Only one active focus session exists per user. The browser interval is display-only; it never owns recorded duration. Multiple tabs subscribe/poll the same active session and cannot start parallel sessions. Timer announcements occur on transitions and final minute boundaries chosen by accessibility settings, never every second.

Result: Pass after separating a locally advancing display from server-authoritative duration and naming the cross-tab state.

## Prototype 6 — weekly planning

```text
No plan
  -> Start plan for explicit timezone/weekStart identity
  -> Draft created
       -> choose outcomes
       -> allocate tasks/blocks to a day
            pointer drag enhancement OR Move form
            each mutation: Saving -> Saved / Failed with input preserved
       -> capacity/conflict summary recalculates from canonical records
       -> resolve, intentionally accept or leave named warnings
  -> Finalize
       -> preflight: capacity, overlaps, unscheduled chosen outcomes,
          stale/version state and carry-over decisions
       -> confirm one immutable plan snapshot
       -> idempotent retry cannot apply carry-over twice
```

Small screens show one selected day at a time and keep outcomes, capacity and unscheduled work in a predictable vertical order. Finalize never becomes disabled without a textual reason. A plan can remain Draft without guilt language or blocking Today.

Result: Changed to save each draft mutation independently with Saving/Saved/Failed status; Finalize is a distinct reviewed action rather than a generic save.

## Prototype 7 — mobile navigation drawer under interruption

Scenarios covered: drawer opened while a focus session is active, an offline banner is present, a toast arrives, screen rotates, virtual keyboard is open, and a route contains a dirty form.

- Active focus and Offline remain concise status rows inside the drawer; they do not create nested drawers.
- A newly arriving toast is announced but does not steal focus or layer over the navigation choices.
- Rotation preserves open/closed state only while the same page remains mounted; dimensions and safe-area padding recalculate.
- Opening the menu dismisses the virtual keyboard before focus enters the drawer.
- A dirty-route confirmation opens only after a new destination is chosen. Cancel returns focus to that drawer destination; the drawer remains open.

Result: Pass after defining dirty-confirmation layering and preventing focus/status overlays from competing with navigation.

## Scenario test record

| Interaction | Normal | Keyboard | Touch/small | Failure/recovery | Result |
| --- | --- | --- | --- | --- | --- |
| Rail navigation | Route + active state | Heading focus | Drawer route | Dirty form blocks safely | Pass |
| Browser Back from detail | List state restored | Row focus restored | Full route returns | Missing row -> heading | Pass |
| Quick Add task | Named confirmation | Full chooser/form path | Full sheet | Input retained | Pass with change |
| Quick Add brain dump offline | Honest local state | Same | Same | Device draft/queue label | Pass |
| Task detail edit | List/detail reconcile | Tabs + form | Full route | 409 compare/copy/reload | Pass |
| Move time block | Ghost + exact time | Move form | Move form | Rollback + proposal retained | Pass with change |
| Resize time block | Handle + duration | Resize form | Resize form | DST/conflict explained | Pass with change |
| Focus refresh/sleep | Session restored | Controls reachable | Centered controls | Server corrects elapsed | Pass |
| Focus in two tabs | One session | Same | Same account | Server state wins | Pass |
| Weekly allocation | Drag enhancement | Move form | Day + Move form | Failed mutation retained | Pass with change |
| Finalize weekly plan | Preflight + confirm | Same | Same | Idempotent/version safe | Pass |
| Mobile drawer | N/A | Focus trap/restore | Safe-area drawer | Dirty layering defined | Pass with change |

## Accepted changes to carry into implementation

1. Quick Add uses a common-type chooser plus More instead of seven equal tabs.
2. Same-route drawer close restores Menu focus; destination navigation focuses the new page heading.
3. Task close restores the originating row or falls back to the list heading when that row disappeared.
4. Time-block gesture changes are visually provisional until acknowledged; a rejection restores the old block and retains the proposal.
5. Touch scheduling uses Move/Resize forms as the primary v1 interaction.
6. Focus shows Reconnecting while retaining a display timer; the server remains the duration authority.
7. Weekly drafts save per mutation, while Finalize performs a separate preflight and snapshot action.
8. Dirty-route confirmation opened from the mobile drawer returns to the drawer when cancelled.

## Unresolved risks and ticket owners

| Risk | Required evidence/decision | Owning ticket(s) |
| --- | --- | --- |
| Exact focus reconciliation under clock skew, sleep and two tabs | State-machine and integration tests using server timestamps | LOS-0912, LOS-0913, LOS-0915, LOS-0918 |
| DST-invalid/ambiguous move and resize presentation | Zoned-time test vectors and form copy | LOS-0902, LOS-0904, LOS-0908, LOS-0918 |
| Optimistic block movement feels stable on slow networks | Mock-screen usability and latency tests | LOS-0907, LOS-0908 |
| Quick Add breadth may overwhelm first-time users | Component prototype and owner validation | LOS-0604, LOS-0616 |
| Large task list restoration after data changes | Router/query/virtualization integration tests | LOS-0603, LOS-0818 |
| Weekly mutation conflicts across tabs/devices | Versioned API, conflict UI and end-to-end tests | LOS-1004, LOS-1008, LOS-1314 |
| Drawer behavior at 320px and 200% zoom | Automated and manual accessibility matrix | LOS-0601, LOS-0603, LOS-1506 |

No unresolved risk changes v1 scope or requires a new epic. These risks are explicit acceptance inputs for their named implementation tickets.

## LOS-0110 acceptance conclusion

All seven required interactions have a normal path, responsive path, non-pointer path, pending state, recovery path and named implementation owner. Five interaction clarifications were needed; they are included above and supersede ambiguous static-wireframe behavior. No route, entity or v1 scope change was introduced.
