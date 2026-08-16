# Cross-cutting states, drawers and dialogs

## Page and widget states

```text
LOADING                 FIRST USE              FILTERED EMPTY
┌──────────────┐        ┌────────────────┐      ┌────────────────┐
│ title real   │        │ why this helps │      │ no matches     │
│ ░░░ reserved │        │ (*) first step │      │ active filters │
│ ░░░ space    │        │ secondary info │      │ (*) Clear      │
└──────────────┘        └────────────────┘      └────────────────┘

PARTIAL ERROR           OFFLINE                 CONFLICT
┌──────────────┐        ┌────────────────┐      ┌────────────────┐
│ data remains │        │ Offline        │      │ Newer version  │
│ one region   │        │ last updated   │      │ local preserved│
│ failed Retry │        │ queued/disabled│      │ Compare/Copy/  │
└──────────────┘        └────────────────┘      │ Reload         │
                                               └────────────────┘
```

Skeletons are hidden from assistive technology. Errors say what was preserved and the next action. A 401 clears private caches but retains only approved safe local drafts.

## Detail panel and mobile sheet

```text
LARGE DETAIL PANEL                 SMALL FULL SHEET/ROUTE
list remains visible               ┌──────────────────────────┐
┌────────────────────────┐         │ Back  record title  ... │
│ title/status       [x] │         ├──────────────────────────┤
│ tabs                   │         │ tabs / section          │
│ detail content         │         │ detail content          │
│ actions                │         │ actions                 │
└────────────────────────┘         └──────────────────────────┘
```

Opening changes canonical URL/selection. Closing restores focus, filters, pagination and scroll. Dirty content triggers Save/Discard/Stay.

## Create/edit form

```text
DESKTOP DIALOG                        MOBILE FULL SCREEN
┌─────────────────────────────┐       ┌─────────────────────────┐
│ Create task             [x]│       │ Back    Create task     │
│ [error summary]             │       │ [error summary]         │
│ [required fields]           │       │ [required fields]       │
│ [advanced collapsed]        │       │ [advanced]              │
│ Cancel      (*) Create      │       │ Cancel   (*) Create     │
└─────────────────────────────┘       └─────────────────────────┘
```

Pending preserves width/values, blocks duplicate submit and allows cancel only when safe. Server validation maps to fields and summary.

## Destructive confirmation

```text
Archive “Project Atlas”?
Its unfinished tasks will [exact chosen behavior].
Recovery: available from Archived until [policy].

Cancel                         Archive project
```

Hard/high-impact deletion may require typed confirmation or recent authentication. Generic “Are you sure?” is insufficient.

## Quick Add

```text
┌──────────────────────────────────────┐
│ Quick Add                       [x] │
│ Task | Brain Dump Item | Time Block │
│ Note | More creation types...       │
├──────────────────────────────────────┤
│ compact type-specific fields        │
│ more options -> canonical form      │
│ Cancel                    (*) Add   │
└──────────────────────────────────────┘
```

More contains Project, Habit Entry and Goal Check-in. Initial focus goes to the type chooser. Each type keeps temporary fields while the overlay remains open. Keyboard shortcut does not fire while typing. Failure preserves fields; success clears only the submitted type, closes/restores context and names the created record.

## Filter drawer

Small-screen Filter/Sort opens a labelled drawer with current values, result preview/count when available, Clear all and Apply. Dismiss without Apply retains prior URL state.

## Toast, alert and live regions

- Toast: concise reversible success/noncritical error; queued/deduplicated; dismissible.
- Inline alert: persistent context or action required near affected region.
- Banner: offline/security/maintenance affecting multiple regions.
- Live announcements: submit result, completion, focus transition; never every timer tick or background widget refresh.

## Attachment optional states

When enabled: Selected -> Uploading -> Scanning -> Available or Quarantined/Failed. Cancel/retry/delete actions preserve authorization. When feature gate is off, file tabs/actions are absent rather than disabled placeholders.

## Long content and large data

- Long titles wrap within defined lines and remain fully available in details, not tooltip-only.
- Unicode/emoji/RTL user text remains readable; controls do not reverse incorrectly.
- Tables paginate/virtualize at defined thresholds; mobile cards keep field labels.
- Export/upload has cancellable progress only when duration is meaningful.
