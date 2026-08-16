# LifeOS content and tone guide

Ticket: LOS-0112

This document governs all user-facing LifeOS language: page copy, forms, validation, states, dialogs, toasts, notifications, reviews, authentication, email and accessible announcements. [LifeOS product vocabulary](./29-PRODUCT-VOCABULARY.md) determines the nouns and action verbs; this guide determines how they are written.

## Voice principles

LifeOS always sounds:

1. Calm — no hype, alarmism, fake urgency or celebration for routine actions.
2. Specific — name the record, state and next action instead of using generic language.
3. Honest — distinguish confirmed, queued, device-only, stale, partial and unknown data.
4. Respectful — support reflection without guilt, shame, judgment or claims about personal worth.
5. Action-forward — lead with what the user can understand or do next.
6. Private by default — reveal the minimum personal detail needed in notifications, logs and public/auth states.

LifeOS is a dependable planning tool, not a coach pretending to know the user. It may describe recorded facts and transparent calculations. It must not infer motivation, discipline, mood, productivity quality or causation without explicit evidence and future approved AI policy.

## Tone by situation

The voice stays consistent while the tone adapts.

| Situation | Tone | Example |
| --- | --- | --- |
| Normal work | Brief and direct | `Add task` |
| First use | Helpful, not promotional | `Add a task to choose what matters today.` |
| Success | Factual and quiet | `Task added.` |
| Waiting | Reassuring but exact | `Saving changes…` |
| Warning | Clear about impact | `This Time Block overlaps another reservation.` |
| Recoverable error | Responsible and useful | `We couldn't save this task. Your changes are still here.` |
| Security | Serious, concise, non-revealing | `Your session expired. Sign in again to continue.` |
| Destructive action | Explicit and neutral | `Delete “Reading notes”? This cannot be undone.` |
| Review | Reflective and non-judgmental | `What should move forward to tomorrow?` |
| Empty history | Matter-of-fact | `There isn't enough history for this trend yet.` |

## Prohibited tone

Do not use:

- guilt or shame: `You failed`, `You broke your streak`, `You were unproductive`;
- hype: `Crush your goals`, `Become unstoppable`, `Amazing!` for routine persistence;
- fake urgency: `Act now`, `Don't fall behind` unless an actual security/time consequence exists;
- unsupported praise: `Perfect day`, `You're 112% productive`;
- vague blame: `You entered something wrong`;
- anthropomorphic certainty: `LifeOS knows what you should do`;
- copied reference-product slogans, names, project data or motivational quotes;
- emoji as product-state language. User-authored emoji remains allowed.

## Writing mechanics

### Capitalization

- Use sentence case for page headings, card headings, buttons, menus, tabs, labels and messages: `Add task`, `Project details`, `In progress`.
- Keep the product and named destinations/experiences as defined: `LifeOS`, `Today`, `Quick Add`, `Time Blocks`, `Focus Mode`, `Week Planner`, `Brain Dump`.
- Do not use all caps for emphasis. Acronyms such as MIT require an expanded accessible explanation on first relevant use.

### Length and structure

- Page title: usually 1–4 words.
- Page helper: one sentence, ideally under 90 characters; omit it when the title and content are self-explanatory.
- Button: a precise verb plus object when context needs it, ideally 1–3 words.
- Toast title/body together: one short outcome plus optional next action; no paragraph.
- Error: what happened, what was preserved, what to do next.
- Destructive dialog: named action, exact consequence, recovery/irreversibility, buttons.

Use active voice and ordinary words. Avoid idioms, metaphors, slang, jargon and culturally specific humor. Contractions such as `couldn't` and `you're` are acceptable in normal UI; legal/security copy may use more formal wording when precision benefits.

### Punctuation

- Buttons, navigation, tabs, labels, badges and short headings have no final period.
- Full helper, validation, empty-state and dialog sentences use normal punctuation.
- Use a real ellipsis (`…`) only for an action that opens a choice/flow or for active progress text: `More…`, `Saving…`. Never use it to make static copy dramatic.
- Avoid exclamation marks except a rare, user-initiated milestone where calm celebration has been explicitly approved.

## Page and section structure

Each screen has one clear page-level heading. Recommended pattern:

```text
Heading: Tasks
Helper: Organize and complete the actions that matter now.
Primary action: Add task
```

Rules:

- A list screen heading uses the destination name: `Projects`, `Tasks`, `Time Blocks`.
- A detail screen heading uses the record title; metadata identifies the entity/status.
- A form title names mode and entity: `Add task`, `Edit task`.
- A dialog title states the decision: `Archive “Website refresh”?`
- A section title names its content, not layout: `Tasks due soon`, not `Right panel`.
- Breadcrumbs and Back labels use the destination: `Back to projects` when the destination is unclear from context.
- Do not repeat the same heading/helper inside the first card.

## Buttons, links and menus

Use the verbs in the vocabulary contract.

| Intent | Approved | Avoid |
| --- | --- | --- |
| Add record | `Add task` | `New`, `Create new`, `Submit` |
| Persist edit | `Save changes` | `Update`, `OK` |
| Dismiss without change | `Cancel` | `Never mind` |
| Open details | `View task` or linked title | `Click here`, `More info` |
| Finish task | `Mark done` | `Complete` when Task status is Done |
| Finish project | `Complete project` | `Mark done` |
| Retry | `Try again` | `Reload` unless a full reload is required |
| Clear filters | `Clear filters` | `Reset` |
| Remove relationship | `Unlink goal` | `Delete goal` |
| Authentication | `Sign in`, `Sign out` | `Login`, `Logout` in UI copy |

One region should have one visually primary action. When two outcomes are equally consequential, use clear secondary treatment rather than two primary buttons. Icon-only controls still have a complete accessible name such as `Close task details`, never only `Close` when several layers could be open.

## Forms and instructions

### Labels and optionality

- Every field has a persistent visible label. Placeholder text is an example, never the only label/instruction.
- Mark optional fields with `(optional)` where uncertainty is likely. Do not mark every required field with an asterisk alone.
- Put stable format/rule guidance before input, not only after failure.
- Keep examples fictional, generic and original to LifeOS.

Approved examples:

```text
Label: Task title
Placeholder: Prepare weekly review

Label: Due date (optional)
Helper: Shown in your current timezone: Asia/Kolkata.

Label: Estimate (optional)
Helper: Your expected effort. You can update it later.
```

### Instruction order

For multi-step work, state:

1. what the step is for;
2. what is required;
3. what will happen next.

Do not use `Please` to soften every instruction. Politeness comes from clarity and control, not filler.

## Validation language

Validation messages identify the field/problem and give a correction. They never blame the user, repeat raw server text, expose implementation details or clear valid input.

### Behavior

- Validate formatting after blur or submit unless immediate feedback clearly helps without interrupting typing.
- On submit, show an error summary linked to invalid fields and inline messages beside each field.
- Move focus to the summary only after a failed submit, not on background validation.
- Preserve all safe values. Focus the first invalid field after the summary is announced/activated.
- Server and client rules use the same message intent; the backend returns stable codes and safe field details, not final localized sentences.

### Approved validation examples

| Condition | Approved message | Avoid |
| --- | --- | --- |
| Missing task title | `Enter a task title.` | `Title is required.` |
| Invalid email shape | `Enter an email address in the format name@example.com.` | `Invalid email.` |
| Password below current policy | `Use at least {minimum} characters.` | `Weak password.` |
| End before start | `Choose an end time after the start time.` | `Invalid range.` |
| Deadline before project start | `Choose a deadline on or after {startDate}.` | `Bad date.` |
| Duplicate Label | `A Label named “{labelName}” already exists.` | `409 duplicate key.` |
| Task depends on itself | `Choose a different Task. A Task can't block itself.` | `Cycle detected.` |
| Dependency cycle | `This dependency would create a loop. Choose a Task outside this dependency chain.` | `Invalid dependency.` |
| Unsupported file | `Choose a {allowedTypes} file up to {maximumSize}.` | `Upload failed.` |

Do not reveal whether an email address has an account in signup/recovery messages.

## Loading and progress language

Use skeletons or reserved space for predictable layouts. Provide accessible status text when waiting is meaningful.

| State | Copy pattern |
| --- | --- |
| Initial list | `Loading tasks…` |
| Saving one edit | `Saving changes…` |
| Background refresh | Usually silent; show `Updated {relativeTime}` only when freshness matters |
| Export queued | `Preparing your export… You can leave this page.` |
| Upload with known progress | `Uploading {fileName}: {percentage}%` |
| Reconnecting focus | `Reconnecting… Your Focus Session is still running.` |

Do not use fake percentages, indefinite `Almost done`, or a blocking spinner for one failed widget. Screen readers receive concise state transitions, not every skeleton or timer tick.

## Empty-state language

An empty state has a truthful title, one helpful explanation and at most one primary action. Distinguish these cases:

| Empty type | Required content | Example |
| --- | --- | --- |
| First use | Benefit + first safe action | `No tasks yet` / `Add a task when you know what needs action.` / `Add task` |
| Naturally complete | Confirm the condition; no forced action | `Nothing due today` / `Your schedule is clear for today.` |
| Filtered empty | Name filters + clear action | `No tasks match these filters.` / `Clear filters` |
| Search empty | Echo safe query only in private UI + suggestions | `No results for “{query}”. Try fewer words or add a new record.` |
| Missing history | Explain minimum evidence | `Not enough history yet` / `This trend appears after {minimumPeriod}.` |
| Optional feature off | Do not render feature entry unless context requires explanation | `Attachments aren't enabled for LifeOS yet.` |
| Permission/unavailable | State unavailability without leaking existence | `This item isn't available.` / `Back to tasks` |

Module examples:

| Module | First-use title | Body | Primary action |
| --- | --- | --- | --- |
| Projects | `No projects yet` | `Add a project to organize related outcomes and Tasks.` | `Add project` |
| Time Blocks | `No Time Blocks for this day` | `Reserve time when you want to protect part of your schedule.` | `Add Time Block` |
| Week Planner | `No Weekly Plan yet` | `Plan this week when you want to compare commitments with capacity.` | `Start plan` |
| Goals | `No goals yet` | `Add a Goal when an outcome needs progress over time.` | `Add Goal` |
| Notes | `No notes yet` | `Add a Note for information you want to keep.` | `Add Note` |
| Brain Dump | `Nothing to process` | `New Brain Dump Items will appear here until you decide what they become.` | `Add Brain Dump Item` |
| Habits | `No habits yet` | `Add a Habit for a behavior you want to track repeatedly.` | `Add Habit` |
| Reviews | `No reviews yet` | `Start a Review when you're ready to reflect on a day, week or month.` | `Start Review` |
| Notifications | `You're up to date` | `New LifeOS notifications will appear here.` | None |

Do not display fabricated examples in production data areas. A clearly labelled preview inside onboarding is allowed when it cannot be mistaken for saved data.

## Success and status feedback

Success copy names the confirmed outcome:

- `Task added.`
- `Changes saved.`
- `“Prepare weekly review” marked done.`
- `Project archived.` with `Undo` only when the backend supports reliable reversal.
- `Weekly Plan finalized.`
- `Focus Session completed. 25 min recorded.`

Use `Saved` only after server acknowledgement. Offline-safe states use exactly:

- `Device draft` — exists only on this approved device/session scope;
- `Queued` — accepted into the local sync queue but not confirmed by the server;
- `Saving…` — request is active;
- `Saved` — server confirmed;
- `Save failed` — server did not confirm and input remains available.

Do not show a success toast and a duplicate inline success message unless one serves a distinct accessibility/context purpose.

## Error and recovery language

### Message formula

```text
What happened. What was preserved/current. Next action.
```

Examples:

| State | Approved copy/action |
| --- | --- |
| Widget failed | `Today's schedule couldn't load. Other Today sections are still available.` / `Try again` |
| Save failed | `We couldn't save this Task. Your changes are still here.` / `Try again` |
| Page failed | `LifeOS couldn't load Tasks right now.` / `Try again` |
| Rate limited | `Too many attempts. Try again in {duration}.` |
| Not found/private | `This item isn't available. It may have been removed, or you may not have access.` |
| Maintenance | `LifeOS is temporarily unavailable. Try again shortly.` |
| Unexpected | `Something went wrong. Try again.` plus `Reference ID: {correlationId}` when available |

Never show stack traces, database/API names, HTTP codes, raw exception text or another user's record existence. Log technical detail server-side with the safe correlation ID.

### Partial failure

Keep successful content visible. Put the error inside the affected region:

```text
Project activity couldn't load. Project details are still available.
[Try again]
```

### Offline

Use a persistent banner when offline affects several actions:

```text
You're offline. Confirmed data was last updated {time}.
```

Then label each mutation honestly. If an action is unsafe offline:

```text
Reconnect to change this recurring series. Your current form values are still here.
```

### Conflict

Never say only `Conflict` or silently overwrite:

```text
This Task changed elsewhere. Your edits are still here.
[Compare changes] [Copy my changes] [Load latest]
```

Use `elsewhere` because the change may be another tab, device or restored session; do not claim another person in v1.

### Authentication expiry

```text
Your session expired. Sign in again to continue.
```

Approved safe drafts may say `Your device draft will be available after you sign in.` Do not promise this for unsaved/private state that was cleared.

## Destructive and high-impact actions

The dialog must name the record and exact consequence. Button labels repeat the action.

### Archive example

```text
Archive “Website refresh”?

The Project will leave active views. Its Tasks remain available according to
their current status. You can restore the Project from Archived.

[Cancel] [Archive project]
```

### Permanent delete example

```text
Delete “Reading notes” permanently?

This Note and its content will be permanently deleted. This can't be undone.

[Cancel] [Delete note permanently]
```

### Delete Label example

```text
Delete Label “Learning”?

The Label will be removed from {recordCount} records. The records will not be
deleted. This can't be undone.

[Cancel] [Delete Label]
```

### Account deletion example

Account deletion copy must state sign-out/session effect, grace period, cancellation path, final purge boundary and backup-retention reality from the approved privacy policy. It requires recent authentication and typed confirmation when specified by the security contract. Do not write those values until LOS-0113 and implementation policy provide them.

Generic `Are you sure?`, `Yes`, `Proceed` and misleading `Remove` are prohibited. Reversible actions prefer Undo when the backend guarantees it; Undo never substitutes for confirmation of an irreversible/high-impact action.

## Review language

Reviews invite observation and choice. They never score character, demand justification or block LifeOS.

Approved prompts:

- `What needs attention today?`
- `Choose one Task as today's MIT.`
- `What helped you make progress today?`
- `What should move forward to tomorrow?`
- `Which commitments no longer belong in this week?`
- `What changed since the start of the month?`
- `What would make next month more realistic?`

Approved state/actions:

- `Review saved as draft.`
- `Resume Review`
- `Finalize Review`
- `Skip for now`
- `You can return to this Review later.`
- `There isn't enough history for this measure yet.`

Avoid:

- `Why didn't you finish?`
- `You missed your goals.`
- `Bad week` / `Great week` as system judgment;
- streak-loss shame, red failure scores or mandatory reflection text;
- claims such as `You were more focused because…` without approved evidence.

## Authentication, privacy and security copy

- User-facing actions are `Sign in`, `Sign out`, `Create account`, `Reset password`.
- Login failure is generic: `Email or password is incorrect.`
- Password recovery result is generic: `If an account matches that email, we'll send password reset instructions.`
- Duplicate signup behavior must not reveal account state beyond the approved identity threat model.
- Token errors distinguish actionable state without leaking account data: `This reset link is invalid or has expired. Request a new link.`
- Security notices state what changed, when, and what to do if unexpected. Do not include credentials, tokens or full sensitive device/network details.
- Public pages, browser titles, lock-screen notifications and URLs must not reveal private record content by default.

## Notifications and email

An in-app notification contains:

1. a specific short title;
2. one factual sentence;
3. a canonical action when useful;
4. an unambiguous timestamp rendered in the user's locale/timezone.

Examples:

```text
Time Block starts in 10 min
“Portfolio review” starts at 14:00.
[Open Time Block]
```

```text
Account password changed
Your LifeOS password was changed at {localizedTime}. If this wasn't you,
reset your password and review active sessions.
[Review sessions]
```

Email subjects begin with the outcome, not promotional copy: `Verify your LifeOS email`, `Reset your LifeOS password`, `Your LifeOS data export is ready`. Email and push previews minimize private content; detailed notification previews require explicit future preference/security review.

## Dates, times, numbers and localization

### Source and translation

- English is the source language for v1. UI strings live behind semantic translation keys from the first implementation; English text is not used as the key.
- Use semantic keys such as `tasks.empty.firstUse.title`, not screen position such as `leftCard.text`.
- Never build sentences by concatenating translated fragments. Use named variables and locale-aware plural/select messages.
- Variables contain escaped user data and meaningful names: `{taskTitle}`, `{count}`, `{dueDate}`.
- Translation must allow longer text, reordered variables, plural categories and right-to-left layout.
- User-authored names/content are never translated, title-cased or normalized for display.

### Locale and timezone

- Render dates, times, durations, numbers and percentages with platform internationalization APIs using the confirmed profile locale and IANA timezone.
- Before profile confirmation, browser locale/timezone may be suggested but never silently treated as permanent.
- Store/transmit canonical date/instant values; formatting belongs at the display boundary.
- `Today`, `tomorrow`, week boundaries, overdue and review periods use the user's timezone, not server UTC or an unconfirmed browser clock.
- Respect locale 12/24-hour preference. Show timezone abbreviation/name when a time could otherwise be ambiguous or during timezone changes.

### Display rules

- Relative time supplements an absolute value where mistakes matter: `Due today, 16 Aug 2026`; accessible text includes the full localized date.
- Avoid numeric-only ambiguous dates such as `08/09/26` in critical context.
- Use localized pluralization: `1 task`, `2 tasks`; never append `s` in code.
- Durations use compact localized units in dense UI (`1 h 30 min`) and a clear spoken label (`1 hour 30 minutes`) where needed.
- Percentages name their metric/base; no unexplained `68%`.
- Never round a value in a way that contradicts a detail/report total. Define rounding per metric contract.
- Do not put user-visible text inside images. Icons are direction-aware where needed; text alignment and control order support RTL.

## Accessibility language

- Visible text and accessible names should match where practical so speech-input users can say the label they see.
- Do not rely on tooltip text as the only instruction or state.
- Status announcements are concise: `Task saved`, `Focus paused`, `3 filters applied`.
- Do not announce timer ticks, background refreshes or every autosave keystroke.
- Error links/summary identify the number and destination of errors without forcing repeated reading.
- Icon buttons include object/context: `Edit “Prepare weekly review”`, `Remove Learning Label from this Task`.
- Charts include a prose summary that names period, metric, value and missing/partial data.
- Avoid directional-only instructions such as `Use the panel on the right`; name the destination/control.

## Original fixture and example policy

Approved neutral fixtures include:

- Projects: `Portfolio refresh`, `Home records cleanup`, `Learning plan`;
- Tasks: `Prepare weekly review`, `Compare hosting options`, `Organize tax documents`;
- Time Blocks: `Deep work`, `Reading`, `Break`, `Weekly planning`;
- Goals: `Build a consistent writing practice`, `Complete the accessibility course`;
- Labels: `Learning`, `Admin`, `Personal`.

Fixtures must not contain real credentials, personal/private user data, reference-product identities such as One System/SmartSpend/Moniqo, copyrighted slogans, or invented production analytics presented as real.

## Approved and rejected examples

| Context | Approved | Rejected | Reason |
| --- | --- | --- | --- |
| Today helper | `See what needs attention and choose what to do next.` | `Dominate your day.` | Calm and specific; no hype. |
| Overdue | `Due 12 Aug 2026 · 4 days overdue` | `You're falling behind!` | Factual date; no blame. |
| No planned tasks | `No tasks planned for today.` | `0% productivity` | Honest no-denominator state. |
| Save error | `We couldn't save this Note. Your changes are still here.` | `500: persistence failure` | Recovery + no technical leak. |
| Offline create | `Queued. This Task will be added after you reconnect.` | `Saved!` | Names unconfirmed state. |
| Conflict | `This Goal changed elsewhere. Your edits are still here.` | `Someone overwrote your Goal.` | Does not invent another actor. |
| Review skip | `Skip for now` | `I give up` | Neutral choice. |
| Archive | `Archive project` | `Delete` | Matches recoverable lifecycle. |
| Loading | `Loading reports…` | `Hang tight, magic is happening!` | Plain and translatable. |
| Search empty | `No results for “{query}”. Try fewer words.` | `Nothing here :( ` | Actionable and accessible. |

## Component copy contract

Every reusable component ticket identifies applicable copy slots and who owns them:

- visible title/body/helper;
- accessible name/description;
- primary/secondary action labels;
- loading/empty/error/disabled text;
- confirmation and success text;
- interpolation variables and pluralization;
- whether server codes map to UI-owned localized messages.

Components must accept semantic content/translation keys or domain-safe message codes according to frontend architecture; they must not invent inconsistent feature copy internally.

## Review checklist

Before UI copy is accepted:

- [ ] Vocabulary nouns, statuses and verbs match `29-PRODUCT-VOCABULARY.md`.
- [ ] The message is calm, specific, honest, respectful and action-forward.
- [ ] Loading/empty/error/offline/conflict/success states do not overclaim.
- [ ] Validation says how to correct the problem and preserves safe input.
- [ ] Destructive copy names the record, consequence and recovery/irreversibility.
- [ ] Review/analytics language avoids guilt, unsupported scoring and causal claims.
- [ ] Public/security copy reveals no account or private-record information.
- [ ] Dates/numbers/plurals use locale/timezone-aware formatting without concatenation.
- [ ] Visible text and accessible names are understandable at 320px, 200% zoom and with assistive technology.
- [ ] Fixtures and examples are original to LifeOS and contain no real personal data.
