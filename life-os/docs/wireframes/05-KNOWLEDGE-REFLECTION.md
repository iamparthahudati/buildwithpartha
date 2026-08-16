# Notes, Brain Dump, progress, reports, reviews and settings wireframes

## Notes — `/app/notes` and `/:noteId`

```text
LARGE
┌──────────────────────────┬────────────────────────────────────────┐
│ Notes        (*) New     │ Note title                 Saved  ... │
│ [Search] [filters]       │ [labels/linked project/task/goal]      │
│ [F NoteCard] pinned      │ -------------------------------------- │
│ [F NoteCard]             │ [F NoteEditor plain/Markdown body]    │
│ [empty/loading/error]    │                                        │
└──────────────────────────┴────────────────────────────────────────┘

SMALL
list route -> select -> full note route
header: Back · title · Saving/Saved/Queued/Conflict · menu
editor; metadata in sheet
```

Conflict keeps server and local versions available. Safe Markdown preview never executes arbitrary HTML/script.

## Brain Dump — `/app/brain-dump`

```text
PageHeader                                  unprocessed count
┌──────────────────────────────────────────────────────────────┐
│ [F BrainCapture: What is on your mind?]      (*) Capture    │
│ Saved / queued / local draft                                  │
└──────────────────────────────────────────────────────────────┘
[Filter: Unprocessed / Deferred / Converted / Archived]
[select/batch bar]
┌──────────────────────────────────────────────────────────────┐
│ [F InboxItem text/date/status] Convert · Defer · Archive ... │
└──────────────────────────────────────────────────────────────┘
```

Conversion flow previews destination Task/Note/Project idea/Goal fields and result. Retry cannot create a second destination.

## Progress — `/app/progress`

```text
PageHeader  [period] [date range] [project/label/category filters]
[MetricCards: named task/focus/project/goal/habit/review measures]
┌─────────────────────────────────┬────────────────────────────┐
│ completion trend chart          │ planned vs actual focus    │
│ [summary + data table]          │ [summary + data table]     │
├─────────────────────────────────┼────────────────────────────┤
│ project/goal progress           │ habit/review consistency   │
└─────────────────────────────────┴────────────────────────────┘
```

No vague overall productivity score. Small stacks chart frames; chart data table/summary remains available.

## Reports — `/app/reports`

```text
PageHeader                                      [Export]
┌──────────────────┬───────────────────────────────────────────┐
│ [F ReportSelector]│ report title + metric explanation       │
│ productivity      │ [FilterBar/date range]                   │
│ tasks/focus       │ [summary cards]                          │
│ projects/goals    │ [chart + accessible data table]          │
│ habits/reviews    │ [export status/history when applicable]  │
└──────────────────┴───────────────────────────────────────────┘
```

Small uses report selector dropdown/sheet, then filters and content. Export dialog names date range, timezone, format and privacy/expiry.

## Review history and flows — `/app/reviews/*`

```text
HISTORY
PageHeader  Start review
[Daily] [Weekly] [Monthly]
[ReviewCard period · finalized/draft/skipped · summary · open/resume]

FLOW
┌──────────────┬───────────────────────────────────────────────┐
│ step list    │ Step heading + prompt                        │
│ progress     │ metric summary/source links                  │
│ saved state  │ [structured decisions / FormFields]          │
│              │ [optional reflection]                        │
│              │ Back · Save/exit · Skip · (*) Continue       │
└──────────────┴───────────────────────────────────────────────┘
```

Small uses one step/section per route state and text progress. Finalize summary names mutations/carry-over and requires explicit confirm.

## Global search — `/app/search` and Command Palette

```text
[C SearchField........................................]
All | Projects | Tasks | Notes | Brain Dump | Goals | Habits
Recent searches / grouped results
[F ResultRow icon/type/title/context/safe highlight]
[loading / no results + Quick Add / error]
```

Command Palette is a modal compact version with keyboard selection and commands/results in separate labelled groups.

## Notifications — `/app/notifications` and drawer

```text
header: Notifications          Mark all read / Settings
Today
[F NotificationRow unread · title/body/time · source action]
Earlier
[row]
[load more]
```

Security notifications use distinct treatment and follow retention/clear rules. Preferences page covers category/channel/quiet hours; browser/email options appear only when implemented.

## Settings — `/app/settings/:section?`

```text
LARGE
┌───────────────────┬──────────────────────────────────────────┐
│ Profile           │ section title + explanation             │
│ Localization      │ [FormFields / rows / save status]       │
│ Planning          │                                          │
│ Notifications     │                                          │
│ Appearance/a11y   │                                          │
│ Security          │                                          │
│ Data & privacy    │                                          │
└───────────────────┴──────────────────────────────────────────┘
```

Small uses a Settings section list, then canonical section route with Back. Security shows sessions/revoke/change password; Data shows export/delete with exact states and destructive confirmation.
